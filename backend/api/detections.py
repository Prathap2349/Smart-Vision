from fastapi import APIRouter
from tracking.tracker import tracker_manager

router = APIRouter(tags=["detections"])

@router.get("/api/detections")
def get_detections():
    tracks = tracker_manager.tracks.values()
    return [
        {
            "track_id": t.track_id,
            "class": "person",
            "confidence": t.confidence,
            "bbox": t.bbox,
            "timestamp": t.last_seen,
            "camera_id": "cam-01"
        }
        for t in tracks
    ]

@router.get("/api/tracks")
def get_active_tracks():
    tracks = tracker_manager.tracks.values()
    return [
        {
            "track_id": t.track_id,
            "first_seen": t.first_seen,
            "last_seen": t.last_seen,
            "current_zone": t.current_zone,
            "dwell_time": t.dwell_seconds,
            "face_status": t.face_status,
            "confidence": t.confidence
        }
        for t in tracks
    ]
