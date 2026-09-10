import time
from typing import Dict, List, Any, Optional
from tracking.zone_checker import check_person_zones

class TrackedSubject:
    def __init__(self, track_id: str, initial_bbox: List[float], timestamp: float):
        self.track_id = track_id
        self.bbox = initial_bbox
        self.first_seen = timestamp
        self.last_seen = timestamp
        self.current_zone = "Corridor Protection Zone"
        self.zone_entry_time: Optional[float] = timestamp
        self.confidence = 0.97
        self.face_status = "UNKNOWN"
        self.resident_name: Optional[str] = None
        self.active = True

    @property
    def dwell_seconds(self) -> float:
        if self.zone_entry_time is None:
            return 0.0
        return round(time.time() - self.zone_entry_time, 1)

    def update(self, bbox: List[float], timestamp: float, zone_name: Optional[str] = None):
        self.bbox = bbox
        self.last_seen = timestamp
        if zone_name and zone_name != self.current_zone:
            self.current_zone = zone_name
            self.zone_entry_time = timestamp
        elif self.zone_entry_time is None:
            self.zone_entry_time = timestamp

class ByteTrackerManager:
    def __init__(self):
        self.tracks: Dict[str, TrackedSubject] = {}
        self.next_id_counter = 1

    def update_tracks(self, detections: List[Dict[str, Any]], zones: List[Dict[str, Any]], frame_w: int = 1280, frame_h: int = 720) -> List[TrackedSubject]:
        now = time.time()
        
        # 1. Expire stale tracks (not seen for > 3.0 seconds)
        expired_ids = [tid for tid, t in self.tracks.items() if now - t.last_seen > 3.0]
        for tid in expired_ids:
            del self.tracks[tid]

        # 2. If no detections present, return remaining non-expired tracks (or empty list)
        if not detections:
            return list(self.tracks.values())

        updated_list = []
        for det in detections:
            bbox = det.get("bbox", [400, 200, 520, 500])
            matched_zones = check_person_zones(bbox, frame_w, frame_h, zones)
            zone_name = matched_zones[0]["name"] if matched_zones else "Corridor Protection Zone"

            # Assign to existing track or create new
            existing = list(self.tracks.values())
            if existing:
                t = existing[0]
                t.update(bbox, now, zone_name)
                t.confidence = det.get("confidence", 0.97)
                updated_list.append(t)
            else:
                track_id = f"#{self.next_id_counter}"
                self.next_id_counter += 1
                t = TrackedSubject(track_id, bbox, now)
                t.current_zone = zone_name
                self.tracks[track_id] = t
                updated_list.append(t)

        return updated_list

tracker_manager = ByteTrackerManager()
