import time
from typing import Dict, List, Any, Optional
from tracking.zone_checker import check_person_zones

def compute_iou(boxA: List[float], boxB: List[float]) -> float:
    """Calculates Intersection over Union (IoU) between two bounding boxes [x1, y1, x2, y2]."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = max(0, boxA[2] - boxA[0]) * max(0, boxA[3] - boxA[1])
    boxBArea = max(0, boxB[2] - boxB[0]) * max(0, boxB[3] - boxB[1])

    iou = interArea / float(boxAArea + boxBArea - interArea + 1e-6)
    return iou

class TrackedSubject:
    def __init__(self, track_id: str, initial_bbox: List[float], timestamp: float, zone_name: str = "Outside ROI"):
        self.track_id = track_id
        self.bbox = initial_bbox
        self.first_seen = timestamp
        self.last_seen = timestamp
        self.current_zone = zone_name
        self.zone_entry_time: Optional[float] = timestamp if zone_name != "Outside ROI" else None
        self.confidence = 0.95
        self.face_status = "UNKNOWN"
        self.resident_name: Optional[str] = None
        self.active = True
        self.snapshot_captured: bool = False
        self.snapshot_base64: Optional[str] = None
        self.snapshot_timestamp: Optional[str] = None

    @property
    def dwell_seconds(self) -> float:
        if self.current_zone == "Outside ROI" or self.zone_entry_time is None:
            return 0.0
        return round(time.time() - self.zone_entry_time, 1)

    def update(self, bbox: List[float], timestamp: float, zone_name: str = "Outside ROI"):
        self.bbox = bbox
        self.last_seen = timestamp
        if zone_name == "Outside ROI":
            self.current_zone = "Outside ROI"
            self.zone_entry_time = None
        elif zone_name != self.current_zone:
            self.current_zone = zone_name
            self.zone_entry_time = timestamp
        elif self.zone_entry_time is None:
            self.zone_entry_time = timestamp

class LightweightIoUTracker:
    """
    Lightweight IoU-Based Object Tracker.
    Performs frame-to-frame bounding box association, maintains independent track IDs,
    dwell timers, and cleans up stale tracks.
    """
    def __init__(self, iou_threshold: float = 0.3, max_staleness_seconds: float = 0.8):
        self.tracks: Dict[str, TrackedSubject] = {}
        self.next_id_counter = 1
        self.iou_threshold = iou_threshold
        self.max_staleness_seconds = max_staleness_seconds

    def update_tracks(
        self,
        detections: List[Dict[str, Any]],
        zones: List[Dict[str, Any]],
        frame_w: int = 1280,
        frame_h: int = 720
    ) -> List[TrackedSubject]:
        now = time.time()

        # 1. Expire stale tracks not updated within max_staleness_seconds
        expired_ids = [tid for tid, t in self.tracks.items() if now - t.last_seen > self.max_staleness_seconds]
        for tid in expired_ids:
            del self.tracks[tid]

        if not detections:
            return list(self.tracks.values())

        # 2. IoU Association Matrix
        active_track_keys = list(self.tracks.keys())
        unmatched_detections = set(range(len(detections)))
        matched_tracks = set()

        for det_idx, det in enumerate(detections):
            det_bbox = det.get("bbox", [400, 200, 520, 500])
            best_iou = 0.0
            best_tid = None

            for tid in active_track_keys:
                if tid in matched_tracks:
                    continue
                t = self.tracks[tid]
                iou = compute_iou(det_bbox, t.bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_tid = tid

            if best_tid is not None and best_iou >= self.iou_threshold:
                # Update existing track
                matched_zones = check_person_zones(det_bbox, frame_w, frame_h, zones)
                zone_name = matched_zones[0]["name"] if matched_zones else "Outside ROI"

                t = self.tracks[best_tid]
                t.update(det_bbox, now, zone_name)
                t.confidence = float(det.get("confidence", 0.95))
                matched_tracks.add(best_tid)
                unmatched_detections.remove(det_idx)

        # 3. Create new tracks for unmatched detections
        for det_idx in unmatched_detections:
            det = detections[det_idx]
            det_bbox = det.get("bbox", [400, 200, 520, 500])
            matched_zones = check_person_zones(det_bbox, frame_w, frame_h, zones)
            zone_name = matched_zones[0]["name"] if matched_zones else "Outside ROI"

            track_id = f"#{self.next_id_counter}"
            self.next_id_counter += 1

            new_track = TrackedSubject(track_id, det_bbox, now, zone_name=zone_name)
            new_track.confidence = float(det.get("confidence", 0.95))
            self.tracks[track_id] = new_track

        return list(self.tracks.values())

# Backward compatibility alias
ByteTrackerManager = LightweightIoUTracker
tracker_manager = LightweightIoUTracker()
