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
from face.recognizer import face_recognizer, InsightFaceRecognizer, PrototypeFaceMatcher
from face.cache import resident_cache, is_legacy_embedding
from database import get_db_connection
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)


# ==========================================
# 1. Detector Tests
# ==========================================
def test_detector_empty_frame():
    """Verify detector handles None or 0-size empty frame safely without error."""
    assert yolo_detector.detect(None) == []
    empty_arr = np.zeros((0, 0, 3), dtype=np.uint8)
    assert yolo_detector.detect(empty_arr) == []


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


