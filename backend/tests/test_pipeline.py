import sys
import os
import time
import pytest
import numpy as np

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai.detector import yolo_detector, YOLOv8PersonDetector
from ai.decision_engine import decision_engine, DecisionEngine
from tracking.tracker import tracker_manager, LightweightIoUTracker, TrackedSubject, compute_iou
from face.recognizer import face_recognizer, PrototypeFaceMatcher
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
# 3. Tracker Tests
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


# ==========================================
# 4. Prototype Face Matcher Tests
# ==========================================
def test_face_matcher_empty():
    """Verify face matcher handles empty/None crops safely."""
    status, name, conf = face_recognizer.match_face(None)
    assert status == "NO_FACE"
    assert name is None
    assert conf == 0.0

    verif = face_recognizer.verify_identity(None)
    assert verif["matched"] is False
    assert verif["status"] == "NO_FACE"


# ==========================================
# 5. REST API Endpoint Tests
# ==========================================
def test_api_health_endpoint():
    """Verify /api/health endpoint returns 200 OK."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "mode" in data


def test_api_cameras_endpoint():
    """Verify /api/cameras endpoint returns camera list."""
    response = client.get("/api/cameras")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_api_people_endpoint():
    """Verify /api/people endpoint returns residents structure."""
    response = client.get("/api/people")
    assert response.status_code == 200
    data = response.json()
    assert "residents" in data
    assert "unknownPersons" in data


def test_api_system_metrics_endpoint():
    """Verify /api/system/metrics endpoint returns health telemetry."""
    response = client.get("/api/system/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "edgeStatus" in data
    assert "ramUsageGb" in data
