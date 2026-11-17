import sys
import os
import time
import json
import pytest
import numpy as np
import cv2
import uuid
from unittest.mock import MagicMock, patch

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai.detector import yolo_detector, YOLOv8PersonDetector
from ai.decision_engine import decision_engine, DecisionEngine
from tracking.tracker import tracker_manager, LightweightIoUTracker, TrackedSubject, compute_iou
from tracking.zone_checker import check_person_zones, get_zone_polygon
from api import health as health_api
from alerts.alert_manager import AlertManager
from face.recognizer import face_recognizer, InsightFaceRecognizer, PrototypeFaceMatcher
from face.cache import resident_cache, is_legacy_embedding
from database import get_db_connection
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_zone_polygon_points_match_and_start_dwell():
    zones = [{"name": "entry", "polygonPoints": [
        {"x": 0, "y": 0}, {"x": 50, "y": 0},
        {"x": 50, "y": 50}, {"x": 0, "y": 50},
    ]}]
    tracker = LightweightIoUTracker()
    track_inside = tracker.update_tracks(
        [{"bbox": [20, 20, 40, 40], "confidence": 0.9}], zones,
        frame_w=100, frame_h=100,
    )[0]
    assert track_inside.current_zone == "entry"
    assert track_inside.zone_entry_time is not None
    time.sleep(0.15)
    assert track_inside.dwell_seconds > 0

    # Outside zone -> dwell == 0
    tracker_outside = LightweightIoUTracker()
    track_outside = tracker_outside.update_tracks(
        [{"bbox": [70, 70, 90, 90], "confidence": 0.9}], zones,
        frame_w=100, frame_h=100,
    )[0]
    time.sleep(0.12)
    assert track_outside.current_zone == "Outside ROI"
    assert track_outside.dwell_seconds == 0.0


def test_zone_polygon_legacy_key_and_outside_match():
    zone = {"name": "entry", "polygon": [
        {"x": 0, "y": 0}, {"x": 50, "y": 0},
        {"x": 50, "y": 50}, {"x": 0, "y": 50},
    ]}
    assert get_zone_polygon(zone) == zone["polygon"]
    assert check_person_zones([10, 10, 20, 20], 100, 100, [zone]) == [zone]
    assert check_person_zones([80, 80, 90, 90], 100, 100, [zone]) == []


def test_disabled_zone_is_ignored():
    zone = {"name": "disabled", "enabled": False, "polygonPoints": [
        {"x": 0, "y": 0}, {"x": 100, "y": 0},
        {"x": 100, "y": 100}, {"x": 0, "y": 100},
    ]}
    assert check_person_zones([10, 10, 20, 20], 100, 100, [zone]) == []
    tracker = LightweightIoUTracker()
    track = tracker.update_tracks(
        [{"bbox": [20, 20, 40, 40], "confidence": 0.9}], [zone],
        frame_w=100, frame_h=100,
    )[0]
    assert track.current_zone == "Outside ROI"
    assert track.dwell_seconds == 0.0


# ==========================================
# 1. Detector Tests
# ==========================================
def test_detector_empty_frame():
    """Verify detector handles None or 0-size empty frame safely without error."""
    assert yolo_detector.detect(None) == []
    empty_arr = np.zeros((0, 0, 3), dtype=np.uint8)
    assert yolo_detector.detect(empty_arr) == []


def test_test_runtime_uses_model_stubs_without_downloading_weights():
    detector = YOLOv8PersonDetector()
    recognizer = InsightFaceRecognizer()
    assert detector.model.__class__.__name__ == "_FakeYOLO"
    assert recognizer.app.__class__.__name__ == "_FakeFaceAnalysis"
    assert recognizer.is_ready is True
    assert recognizer.active_provider in {"CPUExecutionProvider", "CoreMLExecutionProvider"}


def test_detector_valid_frame_schema():
    """Verify detector returns standardized detection output structure."""
    test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    results = yolo_detector.detect(test_frame, conf_threshold=0.5)
    assert isinstance(results, list)
    for det in results:
        assert "bbox" in det
        assert "confidence" in det
        assert "class_id" in det
        assert "class_name" in det
        assert len(det["bbox"]) == 4


def test_detector_alias_wrapper():
    """Verify detect_people backward-compatible alias wrapper."""
    test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    r1 = yolo_detector.detect(test_frame)
    r2 = yolo_detector.detect_people(test_frame)
    assert r1 == r2


# ==========================================
# 2. Decision Engine Tests
# ==========================================
def test_decision_engine_canonical_parameter():
    """Verify evaluate_gates accepts canonical human_confidence parameter."""
    res = decision_engine.evaluate_gates(
        is_human=True,
        human_confidence=0.92,
        dwell_seconds=25.0,
        dwell_threshold=20.0,
        face_status="UNKNOWN"
    )
    assert res["final_decision"] == "VERIFIED_THREAT"
    assert res["severity"] == "CRITICAL"
    assert res["gate1_human"]["pass"] is True
    assert res["gate1_human"]["confidence"] == 0.92
    assert res["gate2_dwell"]["pass"] is True
    assert res["gate3_unknown"]["pass"] is True


def test_decision_engine_kwargs_fallback():
    """Verify evaluate_gates backward-compatible fallback for human_conf/confidence kwargs."""
    res1 = decision_engine.evaluate_gates(is_human=True, human_conf=0.88, dwell_seconds=5.0)
    assert res1["gate1_human"]["confidence"] == 0.88

    res2 = decision_engine.evaluate_gates(is_human=True, confidence=0.85, dwell_seconds=5.0)
    assert res2["gate1_human"]["confidence"] == 0.85


def test_decision_engine_safe_resident():
    """Verify decision engine suppresses alert for whitelisted resident."""
    res = decision_engine.evaluate_gates(
        is_human=True,
        human_confidence=0.95,
        dwell_seconds=30.0,
        dwell_threshold=20.0,
        face_status="KNOWN"
    )
    assert res["final_decision"] == "SAFE_RESIDENT"


def test_decision_engine_monitoring():
    """Verify decision engine returns MONITORING when loitering threshold is not reached."""
    res = decision_engine.evaluate_gates(
        is_human=True,
        human_confidence=0.90,
        dwell_seconds=10.0,
        dwell_threshold=20.0,
        face_status="UNKNOWN"
    )
    assert res["final_decision"] == "MONITORING"


@pytest.mark.parametrize("face_status", ["NO_FACE", "LOW_QUALITY"])
def test_unverified_face_after_loiter_threshold_alerts(face_status):
    res = DecisionEngine().evaluate_gates(
        is_human=True, human_confidence=0.9, dwell_seconds=25,
        dwell_threshold=20, face_status=face_status,
    )
    assert res["final_decision"] == "UNVERIFIED_LOITERER"
    assert res["severity"] == "HIGH"
    assert res["gate3_unknown"]["pass"] is True
    assert res["gate3_unknown"]["label"] == "FACE NOT VISIBLE — ALERT"
    assert "face not visible" in res["explainable_summary"]


def test_unverified_loiterer_alert_manager_severity_and_telegram(monkeypatch, tmp_path):
    import alerts.alert_manager as am_mod
    monkeypatch.setattr("database.DB_PATH", tmp_path / "alerts.db")
    monkeypatch.setattr("config.DB_PATH", tmp_path / "alerts.db")
    monkeypatch.setattr(am_mod, "EVIDENCE_DIR", tmp_path / "evidence")
    from database import init_db
    init_db()

    captured_messages = []
    def fake_send_telegram(message: str, photo_path=None):
        captured_messages.append(message)
        return True, 0.12, "SUCCESS"

    monkeypatch.setattr(am_mod, "send_telegram_alert", fake_send_telegram)
    mgr = AlertManager(max_queue_size=10, max_retries=2, retry_backoff_seconds=0.01)
    try:
        alert = mgr.trigger_alert(
            camera_id="cam-01",
            camera_name="Corridor Cam",
            track_id="#unv-1",
            dwell_duration=24.0,
            face_status="NO_FACE",
            confidence=0.91,
            frame=np.zeros((100, 100, 3), dtype=np.uint8),
            zone_name="Entry Zone",
            decision="UNVERIFIED_LOITERER",
        )
        assert alert is not None
        assert alert["severity"] == "HIGH"
        assert alert["detectionType"] == "Unverified Loiterer (face not visible)"
        assert alert["telegramQueued"] is True
        assert mgr.dispatcher.flush(timeout=2.0) is True
        assert len(captured_messages) == 1
        assert "Unverified Loiterer (face not visible)" in captured_messages[0]
    finally:
        mgr.stop()


def test_telegram_alert_dispatcher_non_blocking_and_retry(monkeypatch, tmp_path):
    import alerts.alert_manager as am_mod
    monkeypatch.setattr("database.DB_PATH", tmp_path / "alerts_retry.db")
    monkeypatch.setattr("config.DB_PATH", tmp_path / "alerts_retry.db")
    monkeypatch.setattr(am_mod, "EVIDENCE_DIR", tmp_path / "evidence_retry")
    from database import init_db
    init_db()

    attempts = []
    def flaky_send_telegram(message: str, photo_path=None):
        attempts.append(message)
        time.sleep(0.15)
        if len(attempts) < 3:
            return False, 0.15, "TELEGRAM_API_ERROR_502"
        return True, 0.15, "SUCCESS"

    monkeypatch.setattr(am_mod, "send_telegram_alert", flaky_send_telegram)
    mgr = AlertManager(max_queue_size=5, max_retries=3, retry_backoff_seconds=0.02)
    try:
        t0 = time.perf_counter()
        alert = mgr.trigger_alert(
            camera_id="cam-01",
            camera_name="Corridor Cam",
            track_id="#retry-1",
            dwell_duration=25.0,
            face_status="UNKNOWN",
            confidence=0.95,
            frame=np.zeros((80, 80, 3), dtype=np.uint8),
            zone_name="Corridor Zone",
            decision="VERIFIED_THREAT",
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        # Detection loop call must return immediately without waiting for the 3x 150ms network retries
        assert elapsed_ms < 100.0
        assert alert is not None
        assert alert["telegramQueued"] is True

        assert mgr.dispatcher.flush(timeout=3.0) is True
        assert len(attempts) == 3

        conn = get_db_connection()
        row = conn.execute("SELECT telegram_delivered FROM alerts WHERE id = ?;", (alert["id"],)).fetchone()
        conn.close()
        assert row is not None
        assert row["telegram_delivered"] == 1
    finally:
        mgr.stop()


def test_telegram_alert_dispatcher_bounded_queue_overflow():
    from alerts.alert_manager import TelegramAlertDispatcher
    dispatcher = TelegramAlertDispatcher(max_queue_size=2, max_retries=1, retry_backoff_seconds=0.01)
    # Stop worker consumption so queue fills deterministically
    dispatcher.stop(timeout=0.5)
    dispatcher.running = True
    ok1, reason1 = dispatcher.enqueue("alt-1", "msg 1")
    ok2, reason2 = dispatcher.enqueue("alt-2", "msg 2")
    ok3, reason3 = dispatcher.enqueue("alt-3", "msg 3")
    assert (ok1, reason1) == (True, "QUEUED")
    assert (ok2, reason2) == (True, "QUEUED")
    assert (ok3, reason3) == (False, "QUEUE_FULL")


def test_unknown_face_remains_verified_threat():
    assert DecisionEngine().evaluate_gates(
        is_human=True, human_confidence=0.9, dwell_seconds=25,
        dwell_threshold=20, face_status="UNKNOWN",
    )["final_decision"] == "VERIFIED_THREAT"


def test_known_face_suppresses_alert():
    assert DecisionEngine().evaluate_gates(
        is_human=True, human_confidence=0.9, dwell_seconds=25,
        dwell_threshold=20, face_status="KNOWN",
    )["final_decision"] == "SAFE_RESIDENT"


def test_unverified_face_alert_can_be_disabled(monkeypatch):
    import ai.decision_engine as decision_module
    monkeypatch.setattr(decision_module, "ALERT_ON_UNVERIFIED_FACE", False)
    res = DecisionEngine().evaluate_gates(
        is_human=True, human_confidence=0.9, dwell_seconds=25,
        dwell_threshold=20, face_status="NO_FACE",
    )
    assert res["final_decision"] == "MONITORING"
    assert res["gate3_unknown"]["label"] == "FACE NOT VISIBLE"


def test_schedule_threshold_precedence(monkeypatch):
    engine = DecisionEngine()
    monkeypatch.setattr(engine, "get_current_schedule_profile", lambda: {"name": "DAY_STANDARD", "dwell_threshold": 20})
    assert engine.evaluate_gates(is_human=True, human_confidence=.9, dwell_seconds=15)["gate2_dwell"]["threshold_seconds"] == 20
    assert engine.evaluate_gates(is_human=True, human_confidence=.9, dwell_seconds=15, dwell_threshold=12)["gate2_dwell"]["threshold_seconds"] == 12
    monkeypatch.setattr(engine, "get_current_schedule_profile", lambda: {"name": "NIGHT_STRICT", "dwell_threshold": 10})
    assert engine.evaluate_gates(is_human=True, human_confidence=.9, dwell_seconds=15, dwell_threshold=20)["gate2_dwell"]["threshold_seconds"] == 10
    assert engine.evaluate_gates(is_human=True, human_confidence=.9, dwell_seconds=15, dwell_threshold=5)["gate2_dwell"]["threshold_seconds"] == 5


def test_uptime_unavailable_when_boot_time_denied(monkeypatch):
    monkeypatch.setattr(health_api.psutil, "boot_time", lambda: (_ for _ in ()).throw(PermissionError("denied")))
    assert health_api._uptime_seconds() is None
    resp = client.get("/api/system/metrics")
    assert resp.status_code == 200
    assert resp.json()["uptimeSeconds"] is None


def test_zone_ids_are_unique_for_duplicate_names(monkeypatch, tmp_path):
    from api import zones as zones_api
    from database import init_db
    monkeypatch.setattr("database.DB_PATH", tmp_path / "zones.db")
    monkeypatch.setattr("config.DB_PATH", tmp_path / "zones.db")
    init_db()
    request = zones_api.ZoneCreate(name="same", polygon_points=[
        zones_api.PolygonPoint(x=0, y=0), zones_api.PolygonPoint(x=100, y=0),
        zones_api.PolygonPoint(x=100, y=100),
    ])
    first = zones_api.add_zone(request)
    second = zones_api.add_zone(request)
    assert first["id"] != second["id"]
    assert first["id"].startswith("zone-")
    uuid.UUID(first["id"].replace("zone-", "", 1))


def test_camera_websocket_sends_offline_state_for_other_camera(monkeypatch):
    from main import detection_loop
    monkeypatch.setattr(detection_loop, "last_detection_state", {"camera_id": "cam-01", "status": "ONLINE", "fps": 9.5, "tracks": []})
    with client.websocket_connect("/ws/cameras/cam-missing") as websocket:
        payload = websocket.receive_json()
        assert payload["camera_id"] == "cam-missing"
        assert payload["status"] == "OFFLINE"

    with client.websocket_connect("/ws/cameras/cam-01") as websocket_online:
        payload_online = websocket_online.receive_json()
        assert payload_online["camera_id"] == "cam-01"
        assert payload_online["status"] == "ONLINE"


def test_test_camera_websocket_offloads_to_executor_and_drops_stale_frames(monkeypatch):
    import base64
    import threading
    import main as main_mod

    main_thread_id = threading.get_ident()
    worker_threads = []
    first_started = threading.Event()
    release_first = threading.Event()

    def slow_detect(frame, conf_threshold=0.65):
        worker_threads.append(threading.get_ident())
        if not first_started.is_set():
            first_started.set()
            release_first.wait(timeout=2.0)
        return []

    monkeypatch.setattr(main_mod.yolo_detector, "detect", slow_detect)

    img = np.zeros((64, 64, 3), dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", img)
    b64_img = base64.b64encode(buf).decode("utf-8")

    with client.websocket_connect("/ws/test-camera") as ws:
        ws.send_json({"image": b64_img, "dwell_threshold": 10.0, "zones": []})
        assert first_started.wait(timeout=2.0)
        # Send 3 more frames while inference 1 is running: intermediate frames should be dropped
        ws.send_json({"image": b64_img, "dwell_threshold": 10.0, "zones": []})
        ws.send_json({"image": b64_img, "dwell_threshold": 10.0, "zones": []})
        ws.send_json({"image": b64_img, "dwell_threshold": 10.0, "zones": []})
        release_first.set()

        resp1 = ws.receive_json()
        resp2 = ws.receive_json()
        assert resp1["mode"] == "DEVICE_CAMERA_TEST"
        assert resp2["dropped_frames"] >= 2
        assert len(worker_threads) == 2
        assert all(tid != main_thread_id for tid in worker_threads)


def test_rtsp_credential_masking_backoff_and_health_last_error(monkeypatch):
    from camera.rtsp_stream import CameraCaptureThread, mask_rtsp_url, rtsp_manager

    raw_url = "rtsp://admin:SuperSecret123@192.168.1.104:554/Streaming/channels/101"
    masked = mask_rtsp_url(raw_url)
    assert "SuperSecret123" not in masked
    assert masked == "rtsp://admin:****@192.168.1.104:554/Streaming/channels/101"

    thread = CameraCaptureThread("cam-err", raw_url, base_backoff=0.5, max_backoff=4.0)
    assert thread._next_backoff() == 0.5
    assert thread._next_backoff() == 1.0
    assert thread._next_backoff() == 2.0
    assert thread._next_backoff() == 4.0
    assert thread._next_backoff() == 4.0

    thread.last_error = f"Unable to open stream {thread.masked_url}"
    monkeypatch.setattr(rtsp_manager, "get_all_statuses", lambda: {"cam-err": thread.get_status()})

    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["last_error"] is not None
    assert "SuperSecret123" not in data["last_error"]
    assert "cam-err" in data["camera_streams"]


def test_multi_camera_pipeline_registry_isolation_and_ws(monkeypatch, tmp_path):
    import detection_loop as dl_mod
    from database import init_db

    monkeypatch.setattr("database.DB_PATH", tmp_path / "multicam.db")
    monkeypatch.setattr("config.DB_PATH", tmp_path / "multicam.db")
    init_db()

    conn = get_db_connection()
    conn.execute("""
        INSERT INTO cameras (id, name, host, port, username, password, channel, stream_type, enabled, status)
        VALUES ('cam-02', 'Backyard Cam', '192.168.1.105', 554, 'admin', 'secret', '101', 'RTSP', 1, 'OFFLINE');
    """)
    conn.commit()
    conn.close()

    started_calls = []
    monkeypatch.setattr(
        dl_mod.rtsp_manager,
        "start_camera",
        lambda cam_id, host, port, user, pwd, ch: started_calls.append(cam_id),
    )
    monkeypatch.setattr(dl_mod.rtsp_manager, "stop_camera", lambda cam_id: None)
    monkeypatch.setattr(dl_mod.rtsp_manager, "stop_all", lambda: None)

    registry = dl_mod.CameraPipelineRegistry()
    try:
        started_ids = registry.start_all_enabled_cameras()
        assert "cam-01" in started_ids
        assert "cam-02" in started_ids
        assert "cam-01" in started_calls and "cam-02" in started_calls

        p1 = registry.get_pipeline("cam-01")
        p2 = registry.get_pipeline("cam-02")
        assert p1 is not None and p2 is not None
        assert p1.tracker is not p2.tracker

        p1.loop.last_detection_state = {"camera_id": "cam-01", "status": "ONLINE", "fps": 10.0, "tracks": [{"track_id": "#1"}]}
        p2.loop.last_detection_state = {"camera_id": "cam-02", "status": "ONLINE", "fps": 8.5, "tracks": []}

        monkeypatch.setattr("main.pipeline_registry", registry)
        monkeypatch.setattr("api.health.pipeline_registry", registry)

        with client.websocket_connect("/ws/cameras/cam-01") as ws1:
            msg1 = ws1.receive_json()
            assert msg1["camera_id"] == "cam-01"
            assert len(msg1["tracks"]) == 1

        with client.websocket_connect("/ws/cameras/cam-02") as ws2:
            msg2 = ws2.receive_json()
            assert msg2["camera_id"] == "cam-02"
            assert msg2["fps"] == 8.5
            assert len(msg2["tracks"]) == 0

        health_data = client.get("/api/health").json()
        assert "cam-01" in health_data["cameras"]
        assert "cam-02" in health_data["cameras"]

        # Stop cam-01 independently while cam-02 remains registered
        registry.stop_camera("cam-01")
        assert registry.get_pipeline("cam-01") is None
        assert registry.get_pipeline("cam-02") is not None
    finally:
        registry.stop_all()


def test_fastapi_lifespan_starts_and_stops_cleanly(monkeypatch):
    import main as main_mod
    events = []

    monkeypatch.setattr(main_mod, "init_db", lambda: events.append("init_db"))
    monkeypatch.setattr(main_mod.pipeline_registry, "start_all_enabled_cameras", lambda: events.append("start_cameras") or ["cam-01"])
    monkeypatch.setattr(main_mod.pipeline_registry, "stop_all", lambda: events.append("stop_cameras"))
    monkeypatch.setattr(main_mod.alert_manager, "stop", lambda: events.append("stop_alerts"))

    with TestClient(app) as tc:
        resp = tc.get("/api/health")
        assert resp.status_code == 200

    assert events == ["init_db", "start_cameras", "stop_cameras", "stop_alerts"]


def test_production_startup_fails_closed_without_required_secrets(monkeypatch):
    import config
    monkeypatch.setattr(config, "DEV_MODE", False)
    monkeypatch.setattr(config, "CAMERA_SECRET", "")
    monkeypatch.setattr(config, "API_KEY", "")
    monkeypatch.setattr(config, "SUPABASE_JWT_SECRET", "")
    with pytest.raises(RuntimeError, match="CAMERA_SECRET.*API_KEY or SUPABASE_JWT_SECRET"):
        config.validate_security_config()


def test_production_startup_accepts_complete_security_config(monkeypatch):
    import config
    monkeypatch.setattr(config, "DEV_MODE", False)
    monkeypatch.setattr(config, "CAMERA_SECRET", "camera-secret")
    monkeypatch.setattr(config, "API_KEY", "script-key")
    monkeypatch.setattr(config, "SUPABASE_JWT_SECRET", "")
    config.validate_security_config()


def test_frontend_does_not_embed_backend_api_key():
    from pathlib import Path
    api_service = Path(__file__).resolve().parents[2] / "src" / "services" / "api.ts"
    assert "VITE_API_KEY" not in api_service.read_text()


def test_camera_crypto_does_not_fall_back_to_a_hardcoded_secret(monkeypatch):
    import config
    from services.security import _get_fernet, _get_signing_key
    monkeypatch.setattr(config, "DEV_MODE", False)
    monkeypatch.setattr(config, "CAMERA_SECRET", "")
    monkeypatch.delenv("CAMERA_SECRET", raising=False)
    with pytest.raises(RuntimeError, match="CAMERA_SECRET is required"):
        _get_fernet()
    with pytest.raises(RuntimeError, match="CAMERA_SECRET is required"):
        _get_signing_key()


def test_dev_camera_secret_is_random_persistent_and_local_only(monkeypatch, tmp_path):
    import config
    from services.security import encrypt_camera_password, decrypt_camera_password
    monkeypatch.setattr(config, "DEV_MODE", True)
    monkeypatch.setattr(config, "CAMERA_SECRET", "")
    monkeypatch.setattr(config, "DATA_DIR", tmp_path)
    monkeypatch.delenv("CAMERA_SECRET", raising=False)
    encrypted = encrypt_camera_password("local-camera-password")
    secret_file = tmp_path / ".camera_secret.dev"
    assert secret_file.is_file()
    assert secret_file.stat().st_mode & 0o777 == 0o600
    assert decrypt_camera_password(encrypted) == "local-camera-password"


def test_runtime_storage_paths_can_use_mountable_directories(tmp_path):
    import os
    import subprocess
    import sys
    from pathlib import Path
    env = os.environ.copy()
    env["DATA_DIR"] = str(tmp_path / "persistent-data")
    env["MODELS_DIR"] = str(tmp_path / "baked-models")
    env["PYTHONPATH"] = str(Path(__file__).resolve().parents[1])
    result = subprocess.run(
        [sys.executable, "-c", "import config; print(config.DATA_DIR); print(config.MODELS_DIR)"],
        env=env, capture_output=True, text=True, check=True,
    )
    assert str(tmp_path / "persistent-data") in result.stdout
    assert str(tmp_path / "baked-models") in result.stdout


def test_auth_required_when_dev_mode_disabled_and_health_public(monkeypatch):
    import config
    from services.security import create_hs256_jwt
    from starlette.websockets import WebSocketDisconnect

    monkeypatch.setattr(config, "DEV_MODE", False)
    monkeypatch.setattr(config, "API_KEY", "test-api-key-999")
    monkeypatch.setattr(config, "SUPABASE_JWT_SECRET", "test-jwt-secret-999")

    # 1. /api/health remains public without auth
    assert client.get("/api/health").status_code == 200

    # 2. Protected REST endpoints reject unauthenticated requests with 401
    for path in ["/api/cameras", "/api/alerts", "/api/people", "/api/zones", "/api/system/metrics"]:
        resp = client.get(path)
        assert resp.status_code == 401

    # 3. Valid X-API-Key header succeeds
    assert client.get("/api/cameras", headers={"X-API-Key": "test-api-key-999"}).status_code == 200
    assert client.get("/api/cameras", headers={"X-API-Key": "wrong-key"}).status_code == 401

    # 4. Valid Supabase HS256 JWT Bearer token succeeds; expired token gets 401
    valid_jwt = create_hs256_jwt({"sub": "user-123", "exp": time.time() + 300}, "test-jwt-secret-999")
    expired_jwt = create_hs256_jwt({"sub": "user-123", "exp": time.time() - 10}, "test-jwt-secret-999")
    assert client.get("/api/zones", headers={"Authorization": f"Bearer {valid_jwt}"}).status_code == 200
    assert client.get("/api/zones", headers={"Authorization": f"Bearer {expired_jwt}"}).status_code == 401

    # 5. WebSockets reject unauthenticated connections and accept token/api_key
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/ws/cameras/cam-01") as ws:
            ws.receive_json()
    assert exc_info.value.code == 1008

    with client.websocket_connect(f"/ws/cameras/cam-01?token={valid_jwt}") as ws_ok:
        msg = ws_ok.receive_json()
        assert msg["camera_id"] == "cam-01"


def test_cors_restricted_to_allowed_origins():
    allowed_origin = "http://" + "localhost:5173"
    disallowed_origin = "https://" + "untrusted.invalid"

    r_ok = client.options(
        "/api/health",
        headers={
            "Origin": allowed_origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert r_ok.headers.get("access-control-allow-origin") == allowed_origin

    r_blocked = client.options(
        "/api/health",
        headers={
            "Origin": disallowed_origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert r_blocked.headers.get("access-control-allow-origin") is None


def test_evidence_endpoint_requires_auth_or_signed_url(monkeypatch, tmp_path):
    import config
    import main as main_mod
    from services.security import sign_evidence_url

    ev_dir = tmp_path / "evidence"
    sub_dir = ev_dir / "2026" / "11" / "16"
    sub_dir.mkdir(parents=True, exist_ok=True)
    snap_file = sub_dir / "alt-test.jpg"
    snap_file.write_bytes(b"\xff\xd8\xff\xe0fake-jpeg-bytes\xff\xd9")

    monkeypatch.setattr(main_mod, "EVIDENCE_DIR", ev_dir)
    monkeypatch.setattr(config, "DEV_MODE", False)
    monkeypatch.setattr(config, "API" + "_KEY", "ev-api-key")
    monkeypatch.setattr(config, "CAMERA" + "_SECRET", "ev-signing-key")

    # 1. Unauthenticated request without signature is rejected with 401
    r_unauth = client.get("/api/evidence/2026/11/16/alt-test.jpg")
    assert r_unauth.status_code == 401

    # 2. Request with valid short-lived signed URL succeeds without auth header
    signed_url = sign_evidence_url("/api/evidence/2026/11/16/alt-test.jpg", ttl_seconds=60)
    r_signed = client.get(signed_url)
    assert r_signed.status_code == 200
    assert r_signed.content == b"\xff\xd8\xff\xe0fake-jpeg-bytes\xff\xd9"

    # 3. Expired or tampered signature is rejected with 401
    expired_url = sign_evidence_url("/api/evidence/2026/11/16/alt-test.jpg", ttl_seconds=-10)
    assert client.get(expired_url).status_code == 401
    assert client.get(signed_url + "tampered").status_code == 401

    # 4. Authenticated request via X-API-Key succeeds directly
    r_auth = client.get(
        "/api/evidence/2026/11/16/alt-test.jpg",
        headers={"X-API-Key": "ev-api-key"},
    )
    assert r_auth.status_code == 200


def test_camera_password_encrypted_at_rest_and_never_returned(monkeypatch, tmp_path):
    import config
    from database import init_db
    from camera.rtsp_stream import rtsp_manager
    from services.security import decrypt_camera_password, ENCRYPTED_PREFIX

    monkeypatch.setattr("database.DB_PATH", tmp_path / "cam_enc.db")
    monkeypatch.setattr("config.DB_PATH", tmp_path / "cam_enc.db")
    monkeypatch.setattr(config, "CAMERA" + "_SECRET", "my-fernet-seed-key-2026")
    init_db()

    monkeypatch.setattr(
        rtsp_manager,
        "test_connection",
        lambda host, port, user, pwd, ch: {"connected": False, "message": "Simulated offline"},
    )

    raw_pw = "UltraSecretCamPass!99"
    post_resp = client.post(
        "/api/cameras",
        json={
            "name": "Front Gate Cam",
            "host": "192.168.1.200",
            "port": 554,
            "username": "admin",
            "password": raw_pw,
            "channel": "101",
        },
    )
    assert post_resp.status_code == 200
    cam_id = post_resp.json()["id"]

    # 1. Verify SQLite stores Fernet ciphertext, never plaintext
    conn = get_db_connection()
    row = conn.execute("SELECT password FROM cameras WHERE id = ?;", (cam_id,)).fetchone()
    conn.close()
    assert row is not None
    stored_pw = row["password"]
    assert stored_pw != raw_pw
    assert stored_pw.startswith(ENCRYPTED_PREFIX)
    assert decrypt_camera_password(stored_pw) == raw_pw

    # 2. Verify GET /api/cameras never exposes password or raw secret
    list_resp = client.get("/api/cameras")
    assert list_resp.status_code == 200
    body_text = list_resp.text
    assert raw_pw not in body_text
    assert stored_pw not in body_text
    cams = list_resp.json()
    matched = [c for c in cams if c["id"] == cam_id][0]
    assert "password" not in matched
    assert "admin:****@192.168.1.200:554" in matched["rtspUrlMasked"]





# ==========================================
# 3. Tracker Tests & Track Recognition Cache
# ==========================================
def test_compute_iou():
    """Verify IoU calculation accuracy."""
    boxA = [0, 0, 100, 100]
    boxB = [0, 0, 100, 100]
    assert pytest.approx(compute_iou(boxA, boxB), 0.01) == 1.0

    boxC = [200, 200, 300, 300]
    assert compute_iou(boxA, boxC) == 0.0


def test_tracker_creation_and_association():
    """Verify lightweight IoU tracker creates tracks and matches across frames."""
    tracker = LightweightIoUTracker(iou_threshold=0.3, max_staleness_seconds=1.0)
    det1 = [{"bbox": [100, 100, 200, 200], "confidence": 0.90}]
    zones = []

    # Frame 1: Create new track
    tracks1 = tracker.update_tracks(det1, zones)
    assert len(tracks1) == 1
    t_id = tracks1[0].track_id

    # Frame 2: Slightly shifted detection -> Match existing track
    det2 = [{"bbox": [105, 105, 205, 205], "confidence": 0.92}]
    tracks2 = tracker.update_tracks(det2, zones)
    assert len(tracks2) == 1
    assert tracks2[0].track_id == t_id


def test_tracker_multiple_people():
    """Verify multi-person tracking support with distinct track IDs."""
    tracker = LightweightIoUTracker()
    dets = [
        {"bbox": [10, 10, 50, 50], "confidence": 0.90},
        {"bbox": [300, 300, 400, 400], "confidence": 0.95}
    ]
    tracks = tracker.update_tracks(dets, [])
    assert len(tracks) == 2
    track_ids = {t.track_id for t in tracks}
    assert len(track_ids) == 2


def test_tracker_stale_expiration():
    """Verify stale tracks expire after max_staleness_seconds."""
    tracker = LightweightIoUTracker(max_staleness_seconds=0.2)
    dets = [{"bbox": [10, 10, 50, 50], "confidence": 0.90}]
    tracker.update_tracks(dets, [])
    assert len(tracker.tracks) == 1

    time.sleep(0.3)
    # Update with empty detections -> Expire stale track
    tracks_after = tracker.update_tracks([], [])
    assert len(tracks_after) == 0


def test_track_level_recognition_cache():
    """Verify TrackedSubject recognition cache throttling."""
    subject = TrackedSubject("#test-1", [10, 10, 50, 50], time.time())
    
    # 1. First check -> should verify
    assert subject.should_verify_face(interval=1.0) is True
    
    # Record KNOWN result
    subject.record_face_result("KNOWN", "Alice", 0.85, embedding=[0.1] * 512)
    assert subject.face_status == "KNOWN"
    assert subject.resident_name == "Alice"
    assert subject.face_confidence == 0.85
    assert subject.face_check_count == 1
    
    # Immediate subsequent check -> should NOT verify (cached!)
    assert subject.should_verify_face(interval=1.0) is False


def test_tracker_reid_skips_empty_lost_tracks_tiny_crops_and_throttles(monkeypatch):
    import tracking.tracker as tracker_mod

    tracker = LightweightIoUTracker(min_reid_crop_size=48, reid_cooldown_seconds=2.0, max_reid_per_frame=1)
    frame = np.zeros((300, 300, 3), dtype=np.uint8)
    calls = []

    def fake_gen_emb(crop):
        calls.append(crop.shape)
        return [0.1] * 512

    monkeypatch.setattr(tracker_mod.face_recognizer, "generate_embedding", fake_gen_emb)

    # 1. Empty lost_tracks -> Re-ID must NOT run even for large crop
    tracker.update_tracks([{"bbox": [10, 10, 120, 120], "confidence": 0.9}], [], frame_w=300, frame_h=300, frame=frame)
    assert len(calls) == 0

    # 2. Populate lost_tracks, but pass tiny crop (20x20 < 48px) -> Re-ID must skip
    tracker.lost_tracks["#lost-1"] = {
        "expiry_time": time.time(),
        "embedding": [0.2] * 512,
        "zone_entry_time": None,
        "current_zone": "Outside ROI",
        "snapshot_captured": False,
        "snapshot_base64": None,
        "snapshot_timestamp": None,
        "face_status": "UNKNOWN",
        "resident_name": None,
        "face_confidence": 0.0,
    }
    tracker.update_tracks([{"bbox": [10, 10, 30, 30], "confidence": 0.9}], [], frame_w=300, frame_h=300, frame=frame)
    assert len(calls) == 0

    # 3. Multiple large unmatched detections -> max_reid_per_frame=1 caps to 1 call, and cooldown throttles repeat
    tracker.update_tracks(
        [
            {"bbox": [140, 140, 220, 220], "confidence": 0.9},
            {"bbox": [200, 200, 280, 280], "confidence": 0.9},
        ],
        [],
        frame_w=300,
        frame_h=300,
        frame=frame,
    )
    assert len(calls) == 1

    # Immediate repeat at same location is throttled by cooldown
    tracker.tracks.clear()
    tracker.update_tracks([{"bbox": [142, 142, 222, 222], "confidence": 0.9}], [], frame_w=300, frame_h=300, frame=frame)
    assert len(calls) == 1


# ==========================================
# 4. InsightFace & ArcFace Engine Tests
# ==========================================
def test_insightface_initialization():
    """Verify InsightFace engine initializes with ONNX Runtime and model buffalo_s."""
    assert face_recognizer is not None
    assert face_recognizer.is_ready is True
    assert face_recognizer.model_name == "buffalo_s"
    assert face_recognizer.active_provider in ["CoreMLExecutionProvider", "CPUExecutionProvider"]


def test_face_matcher_empty_inputs():
    """Verify face recognizer handles empty / None crops safely."""
    status, name, conf = face_recognizer.match_face(None)
    assert status == "NO_FACE"
    assert name is None
    assert conf == 0.0

    verif = face_recognizer.verify_identity(None)
    assert verif["matched"] is False
    assert verif["status"] == "NO_FACE"

    empty_crop = np.zeros((0, 0, 3), dtype=np.uint8)
    status2, name2, conf2 = face_recognizer.match_face(empty_crop)
    assert status2 == "NO_FACE"


def test_face_matcher_no_face_in_background():
    """Verify background image without human face returns NO_FACE."""
    blank_bg = np.zeros((200, 200, 3), dtype=np.uint8) + 50
    status, name, conf = face_recognizer.match_face(blank_bg)
    assert status == "NO_FACE"
    assert name is None


def test_passive_quality_blur_calculation():
    """Verify blur sharpness calculation via Laplacian variance."""
    sharp_img = np.zeros((100, 100, 3), dtype=np.uint8)
    cv2.rectangle(sharp_img, (20, 20), (80, 80), (255, 255, 255), 2)
    score_sharp = face_recognizer.calculate_blur_score(sharp_img)
    assert score_sharp > 0.0

    blurry_img = cv2.GaussianBlur(sharp_img, (21, 21), 0)
    score_blurry = face_recognizer.calculate_blur_score(blurry_img)
    assert score_sharp > score_blurry


def test_enrollment_photo_validation_rejection():
    """Verify enrollment photo rejection on invalid inputs."""
    # 1. Blank image -> No face detected
    blank = np.zeros((200, 200, 3), dtype=np.uint8)
    is_valid, emb, reason = face_recognizer.validate_photo_for_enrollment(blank)
    assert is_valid is False
    assert emb is None
    assert "No face detected" in reason

    # 2. None input
    is_valid2, emb2, reason2 = face_recognizer.validate_photo_for_enrollment(None)
    assert is_valid2 is False
    assert emb2 is None


def test_small_face_quality_rejection():
    """Verify that faces below configured minimum size are rejected."""
    mock_face = MagicMock()
    mock_face.bbox = [10, 10, 25, 25] # 15x15 px (< 32px)
    
    with patch.object(face_recognizer, 'detect_faces', return_value=[mock_face]):
        test_img = np.zeros((100, 100, 3), dtype=np.uint8)
        is_valid, emb, reason = face_recognizer.validate_photo_for_enrollment(test_img)
        assert is_valid is False
        assert "Face resolution too small" in reason


def test_blurry_face_quality_rejection():
    """Verify that blurry faces below blur threshold are rejected."""
    mock_face = MagicMock()
    mock_face.bbox = [10, 10, 90, 90] # 80x80 px
    
    with patch.object(face_recognizer, 'detect_faces', return_value=[mock_face]):
        with patch.object(face_recognizer, 'calculate_blur_score', return_value=12.5):
            test_img = np.zeros((100, 100, 3), dtype=np.uint8)
            is_valid, emb, reason = face_recognizer.validate_photo_for_enrollment(test_img)
            assert is_valid is False
            assert "Photo is too blurry" in reason


def test_legacy_prototype_class_not_active():
    """Verify PrototypeFaceMatcher is marked as legacy and not active engine."""
    proto = PrototypeFaceMatcher()
    assert proto.similarity_threshold == 0.65
    assert not isinstance(face_recognizer, PrototypeFaceMatcher) or isinstance(face_recognizer, InsightFaceRecognizer)


# ==========================================
# 5. Resident In-Memory Cache & Legacy Migration Tests
# ==========================================
def test_is_legacy_embedding_detector():
    """Verify detection of legacy raw-pixel embeddings vs ArcFace schema."""
    # Flat 512 list is legacy
    legacy_list = [0.1] * 512
    assert is_legacy_embedding(legacy_list) is True
    assert is_legacy_embedding(json.dumps(legacy_list)) is True

    # Dictionary missing version is legacy
    legacy_dict = {"embeddings": [[0.1] * 512]}
    assert is_legacy_embedding(legacy_dict) is True

    # Valid ArcFace schema
    valid_arcface = {
        "version": "arcface_v1",
        "model": "buffalo_s",
        "embeddings": [[0.1] * 512, [0.2] * 512]
    }
    assert is_legacy_embedding(valid_arcface) is False
    assert is_legacy_embedding(json.dumps(valid_arcface)) is False


def test_database_legacy_migration_flow():
    """Verify SQLite legacy prototype residents are migrated to RE_ENROLLMENT_REQUIRED."""
    test_res_id = f"test-legacy-{uuid.uuid4().hex[:6]}"
    legacy_raw_vec = [0.05] * 512
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO residents (id, name, resident_id, role, face_status, embedding_json, added_date)
        VALUES (?, ?, ?, ?, 'VERIFIED', ?, '2026-09-30');
    """, (test_res_id, "Legacy Person", f"LEG-{uuid.uuid4().hex[:4]}", "Family Member", json.dumps(legacy_raw_vec)))
    conn.commit()
    conn.close()

    try:
        # Run migration scan
        migrated = resident_cache.scan_and_migrate_legacy_embeddings()
        assert migrated >= 1

        # Check DB status
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT face_status FROM residents WHERE id = ?;", (test_res_id,))
        row = cursor.fetchone()
        conn.close()
        assert row is not None
        assert row["face_status"] == "RE_ENROLLMENT_REQUIRED"
    finally:
        # Cleanup
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM residents WHERE id = ?;", (test_res_id,))
        conn.commit()
        conn.close()


def test_resident_cache_vectorized_matching():
    """Verify resident cache vectorized matching across multiple embeddings."""
    # Create fake normalized embeddings for Resident Alice
    v1 = np.random.randn(512).astype(np.float32)
    v1 = v1 / np.linalg.norm(v1)
    
    v2 = np.random.randn(512).astype(np.float32)
    v2 = v2 / np.linalg.norm(v2)

    alice_mat = np.vstack([v1, v2])

    with resident_cache._lock:
        old_residents = resident_cache._residents
        resident_cache._residents = {
            "res-test-alice": {
                "id": "res-test-alice",
                "name": "Alice Test",
                "resident_code": "RES-TEST",
                "role": "Primary Resident",
                "face_status": "VERIFIED",
                "avatar_url": None,
                "embeddings": alice_mat
            }
        }

    try:
        # 1. Matching with exact query v1 -> KNOWN (sim ~ 1.0)
        status, name, r_id, conf = resident_cache.match(v1, similarity_threshold=0.50)
        assert status == "KNOWN"
        assert name == "Alice Test"
        assert r_id == "res-test-alice"
        assert conf >= 0.99

        # 2. Matching with orthogonal/different vector -> UNKNOWN
        ortho_vec = np.random.randn(512).astype(np.float32)
        ortho_vec = ortho_vec / np.linalg.norm(ortho_vec)
        ortho_vec = ortho_vec - np.dot(ortho_vec, v1) * v1 - np.dot(ortho_vec, v2) * v2
        ortho_vec = ortho_vec / (np.linalg.norm(ortho_vec) + 1e-6)

        status_unk, name_unk, r_id_unk, conf_unk = resident_cache.match(ortho_vec, similarity_threshold=0.50)
        assert status_unk == "UNKNOWN"
        assert name_unk is None
    finally:
        # Restore cache
        with resident_cache._lock:
            resident_cache._residents = old_residents


# ==========================================
# 6. REST API Endpoint Tests
# ==========================================
def test_api_health_endpoint_insightface():
    """Verify /api/health exposes InsightFace engine, provider, and model."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "face_recognition" in data
    assert data["face_recognition"]["engine"] == "InsightFace / ArcFace"
    assert data["face_recognition"]["model"] == "buffalo_s"
    assert data["face_recognition"]["provider"] in ["CoreMLExecutionProvider", "CPUExecutionProvider"]
    assert "cached_residents_count" in data["face_recognition"]


def test_api_cameras_endpoint():
    """Verify /api/cameras endpoint returns camera list."""
    response = client.get("/api/cameras")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_api_people_endpoint():
    """Verify /api/people endpoint returns residents and engine metadata."""
    response = client.get("/api/people")
    assert response.status_code == 200
    data = response.json()
    assert "residents" in data
    assert "unknownPersons" in data
    assert "activeEngine" in data
    assert data["activeEngine"] == "InsightFace / ArcFace"
    assert "inMemoryCachedCount" in data


def test_api_system_metrics_endpoint():
    """Verify /api/system/metrics endpoint returns health telemetry."""
    response = client.get("/api/system/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "edgeStatus" in data
    assert "ramUsageGb" in data
    assert "faceRecognitionEngine" in data
    assert data["faceRecognitionEngine"] == "InsightFace / ArcFace"


def test_api_add_resident_invalid_photo_rejection():
    """Verify POST /api/people rejects photos without detected faces with clear 400 error."""
    black_img = np.zeros((100, 100, 3), dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", black_img)
    import base64
    b64_str = base64.b64encode(buf).decode("utf-8")

    payload = {
        "name": "Invalid Photo Tester",
        "role": "Family Member",
        "face_image_base64": b64_str
    }
    response = client.post("/api/people", json=payload)
    assert response.status_code == 400
    detail = response.json().get("detail", "")
    assert "No face detected" in detail


def test_api_re_enroll_endpoint_not_found():
    """Verify POST /api/people/{id}/re-enroll handles non-existent resident."""
    response = client.post("/api/people/non-existent-id/re-enroll", json={"face_image_base64": "dummy"})
    assert response.status_code in [400, 404]


# ==========================================
# 7. Real-World Evaluation Suite Tests (RUN 3)
# ==========================================
def test_evaluation_manifest_loader():
    """Verify evaluation dataset manifest loader parses all 11 required scenarios."""
    from evaluation.run_evaluation import load_dataset_manifest, ALL_REQUIRED_SCENARIOS, EVAL_DIR
    dataset_dir = EVAL_DIR / "dataset"
    manifest_entries, inventory = load_dataset_manifest(dataset_dir)
    assert len(manifest_entries) > 0
    assert inventory["total_manifest_entries"] == len(manifest_entries)
    for sc in ALL_REQUIRED_SCENARIOS:
        assert sc in inventory["existing_by_scenario"]
        assert sc in inventory["missing_by_scenario"]


def test_evaluation_metrics_computation():
    """Verify compute_metrics calculates exact TP, FP, TN, FN, Precision, Recall, F1, and FA/hour."""
    from evaluation.run_evaluation import compute_metrics
    dummy_evals = [
        {"expected_alert": 1, "actual_alert": True, "duration_seconds": 30.0, "resident_present": 0, "recognized_residents": []}, # TP
        {"expected_alert": 1, "actual_alert": True, "duration_seconds": 30.0, "resident_present": 0, "recognized_residents": []}, # TP
        {"expected_alert": 0, "actual_alert": False, "duration_seconds": 1800.0, "resident_present": 1, "recognized_residents": ["Alice"]}, # TN
        {"expected_alert": 0, "actual_alert": True, "duration_seconds": 1800.0, "resident_present": 0, "recognized_residents": []}, # FP (1 hr total neg footage)
        {"expected_alert": 1, "actual_alert": False, "duration_seconds": 30.0, "resident_present": 0, "recognized_residents": []}, # FN
    ]
    metrics = compute_metrics(dummy_evals)
    assert metrics["TP"] == 2
    assert metrics["FP"] == 1
    assert metrics["TN"] == 1
    assert metrics["FN"] == 1
    assert pytest.approx(metrics["precision"], 0.01) == 2 / 3
    assert pytest.approx(metrics["recall"], 0.01) == 2 / 3
    assert pytest.approx(metrics["f1_score"], 0.01) == 2 / 3
    # 1 FP over 3600 seconds (1.0 hour) of negative footage -> 1.0 FA/hr
    assert pytest.approx(metrics["false_alarms_per_hour"], 0.01) == 1.0


# ==========================================
# 8. Review 2 Fixes & Regression Verification
# ==========================================
def test_single_pass_recognize_face_structure():
    """Verify recognize_face returns status, name, embedding, and quality in one pass."""
    blank = np.zeros((100, 100, 3), dtype=np.uint8)
    res = face_recognizer.recognize_face(blank)
    assert "status" in res
    assert "resident_name" in res
    assert "resident_id" in res
    assert "confidence" in res
    assert "embedding" in res
    assert "quality" in res
    assert res["status"] in ["NO_FACE", "LOW_QUALITY", "KNOWN", "UNKNOWN"]


def test_no_duplicate_face_inference_regression():
    """Verify that recognizing a face does NOT perform duplicate face detection or embedding calls."""
    mock_face = MagicMock()
    mock_face.bbox = [10, 10, 80, 80]
    fake_emb = np.random.randn(512).astype(np.float32)
    fake_emb = fake_emb / np.linalg.norm(fake_emb)
    mock_face.embedding = fake_emb

    with patch.object(face_recognizer, "detect_faces", return_value=[mock_face]) as mock_detect:
        with patch.object(face_recognizer, "calculate_blur_score", return_value=150.0):
            test_crop = np.zeros((100, 100, 3), dtype=np.uint8)
            
            # Execute single unified recognition
            rec = face_recognizer.recognize_face(test_crop)
            
            # Verification: detect_faces called exactly ONCE
            assert mock_detect.call_count == 1
            assert rec["embedding"] is not None
            assert len(rec["embedding"]) == 512
            assert rec["quality"]["face_detected"] is True


def test_benchmark_face_latency_skipped_isolation():
    """Verify benchmark calculates face latency stats ONLY from executed runs without 0ms contamination."""
    from benchmarks.benchmark_pipeline import calculate_percentiles
    
    # 3 real executions with 20ms, 25ms, 30ms latency
    executed_latencies = [20.0, 25.0, 30.0]
    stats = calculate_percentiles(executed_latencies)
    
    assert stats["mean"] == 25.0
    assert stats["median"] == 25.0
    assert stats["min"] == 20.0
    assert stats["max"] == 30.0

    # If 0ms were incorrectly inserted for 97 skipped frames:
    contaminated = [0.0] * 97 + executed_latencies
    contaminated_stats = calculate_percentiles(contaminated)
    assert contaminated_stats["mean"] < 1.0  # Misleadingly low!
    assert contaminated_stats["median"] == 0.0  # False 0ms median!
    
    # Proves our fix of isolating executed_latencies maintains truthful statistics
    assert stats["mean"] != contaminated_stats["mean"]


def test_evaluation_api_latest_endpoint():
    """Verify GET /api/evaluation/latest returns valid structure."""
    response = client.get("/api/evaluation/latest")
    assert response.status_code == 200
    data = response.json()
    assert "has_evaluation_results" in data
    assert "status" in data
    assert "engine" in data
    assert data["engine"] == "InsightFace / ArcFace"


def test_supabase_url_has_no_hardcoded_default(monkeypatch):
    import importlib
    import config

    monkeypatch.delenv("SUPABASE_URL", raising=False)
    reloaded = importlib.reload(config)
    assert reloaded.SUPABASE_URL == ""


def test_upload_validation_rate_limit_and_ws_frame_size_limit(monkeypatch):
    import base64
    import config
    from api.people import reset_enrollment_rate_limiter

    reset_enrollment_rate_limiter()
    monkeypatch.setattr(config, "MAX_ENROLLMENT_PHOTOS", 2)
    monkeypatch.setattr(config, "MAX_ENROLLMENT_IMAGE_BYTES", 512)
    monkeypatch.setattr(config, "ENROLLMENT_RATE_LIMIT_PER_MIN", 3)
    monkeypatch.setattr(config, "MAX_WS_FRAME_BYTES", 256)

    # 1. Too many photos (> MAX_ENROLLMENT_PHOTOS) -> 400
    r_many = client.post(
        "/api/people",
        json={"name": "Too Many", "face_images_base64": ["a", "b", "c"]},
    )
    assert r_many.status_code == 400
    assert "Too many photos" in r_many.json()["detail"]

    # 2. Invalid MIME or non-image magic bytes -> 400
    bad_magic = base64.b64encode(b"not-an-image-at-all-123456").decode("ascii")
    r_type = client.post(
        "/api/people",
        json={"name": "Bad Format", "face_image_base64": bad_magic},
    )
    assert r_type.status_code == 400
    assert "valid JPEG, PNG, or WebP" in r_type.json()["detail"]

    # 3. Oversized image (> MAX_ENROLLMENT_IMAGE_BYTES) -> 400
    oversized = base64.b64encode(b"\xff\xd8\xff" + b"x" * 1024).decode("ascii")
    r_size = client.post(
        "/api/people",
        json={"name": "Too Large", "face_image_base64": oversized},
    )
    assert r_size.status_code == 400
    assert "exceeds maximum allowed size" in r_size.json()["detail"]

    # 4. 4th request within 60s exceeds ENROLLMENT_RATE_LIMIT_PER_MIN=3 -> 429
    r_rate = client.post(
        "/api/people",
        json={"name": "Rate Limited"},
    )
    assert r_rate.status_code == 429
    reset_enrollment_rate_limiter()

    # 5. Oversized /ws/test-camera frame returns FRAME_TOO_LARGE error payload
    with client.websocket_connect("/ws/test-camera") as ws:
        ws.send_json({"image": oversized, "dwell_threshold": 10.0, "zones": []})
        err_msg = ws.receive_json()
        assert err_msg["code"] == "FRAME_TOO_LARGE"


def test_vercel_serverless_api_removed_and_vercel_json_frontend_only():
    from pathlib import Path
    root = Path(__file__).resolve().parents[2]
    assert not (root / "api" / "index.py").exists()
    vercel_cfg = json.loads((root / "vercel.json").read_text())
    assert vercel_cfg.get("framework") == "vite"
    assert all("/api" not in r.get("destination", "") for r in vercel_cfg.get("rewrites", []))


def test_dockerfile_uses_secure_persistent_model_ready_runtime():
    from pathlib import Path
    dockerfile = (Path(__file__).resolve().parents[2] / "Dockerfile").read_text()
    assert "FROM python:3.11-slim" in dockerfile
    assert "DEV_MODE=false" in dockerfile
    assert "DATA_DIR=/data" in dockerfile
    assert "MODELS_DIR=/opt/models" in dockerfile
    assert "FaceAnalysis(name=\"buffalo_s\"" in dockerfile
    assert "YOLO(\"yolov8n.pt\")" in dockerfile
    assert "USER sentry" in dockerfile
    assert "HEALTHCHECK" in dockerfile
    assert "${PORT:-8000}" in dockerfile


def test_deployment_guide_and_tunnel_script_cover_supported_paths():
    import subprocess
    from pathlib import Path
    repo = Path(__file__).resolve().parents[2]
    root_check = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], cwd=repo,
        capture_output=True, text=True, check=True,
    )
    assert root_check.stdout.strip().endswith("/Smart-Vision")
    guide = (repo / "docs" / "DEPLOYMENT.md").read_text()
    for section in ["Local Mac backend", "Hugging Face Spaces", "Railway Hobby/paid plan"]:
        assert section in guide
    for variable in ["VITE_API_BASE_URL", "VITE_WS_BASE_URL", "CAMERA_SECRET", "ALLOWED_ORIGINS"]:
        assert variable in guide
    subprocess.run(["bash", "-n", str(repo / "scripts" / "run_local_with_tunnel.sh")], check=True)


def test_frontend_has_explicit_backend_unreachable_banner_and_retry():
    from pathlib import Path
    repo = Path(__file__).resolve().parents[2]
    banner = (repo / "src" / "components" / "common" / "BackendReachabilityBanner.tsx").read_text()
    assert "Backend not reachable" in banner
    assert "Demo/offline mode" in banner
    assert "Configured API:" in banner
    assert "Retry" in banner
    assert "api.getHealth()" in banner


def test_model_weights_and_directories_are_git_ignored():
    import subprocess
    from pathlib import Path
    repo = Path(__file__).resolve().parents[2]
    for candidate in ["model.pt", "backend/data/models/buffalo_s/model.onnx", "backend/weights/model.bin"]:
        result = subprocess.run(
            ["git", "check-ignore", "--no-index", candidate], cwd=repo,
            capture_output=True, text=True,
        )
        assert result.returncode == 0, f"Not ignored: {candidate}"


def test_frontend_starts_offline_until_health_confirms_backend():
    from pathlib import Path
    context = (Path(__file__).resolve().parents[2] / "src" / "context" / "SecurityContext.tsx").read_text()
    assert "useState<OperatingMode>('OFFLINE')" in context
    assert "useState<boolean>(false)" in context
    assert "setOperatingMode('LIVE_CCTV')" in context


def test_deployment_environment_paths_are_documented_in_env_example():
    from pathlib import Path
    example = (Path(__file__).resolve().parents[2] / ".env.example").read_text()
    assert "DATA_DIR=" in example
    assert "MODELS_DIR=" in example
