import time
import json
from typing import Dict, List, Any, Optional
from collections import deque
import numpy as np
from tracking.zone_checker import check_person_zones
from face.recognizer import face_recognizer

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
    def __init__(self, track_id: str, initial_bbox: List[float], timestamp: float, zone_name: str = "Outside ROI", confidence: float = 0.0):
        self.track_id = track_id
        self.bbox = initial_bbox
        self.first_seen = timestamp
        self.last_seen = timestamp
        self.current_zone = zone_name
        self.zone_entry_time: Optional[float] = timestamp if zone_name != "Outside ROI" else None
        self.confidence = confidence  # real YOLO detection confidence — no hardcoded placeholder
        self.face_status = "UNKNOWN"
        self.resident_name: Optional[str] = None
        self.active = True
        self.snapshot_captured: bool = False
        self.snapshot_base64: Optional[str] = None
        self.snapshot_timestamp: Optional[str] = None
        self.last_embedding: Optional[List[float]] = None

    @property
    def dwell_seconds(self) -> float:
        if self.current_zone == "Outside ROI" or self.zone_entry_time is None:
            return 0.0
        return round(time.time() - self.zone_entry_time, 1)

    def update(self, new_bbox: List[float], timestamp: float, zone_name: str = "Outside ROI"):
        self.bbox = new_bbox
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
    def __init__(self, iou_threshold: float = 0.3, max_staleness_seconds: float = 2.0):
        self.tracks: Dict[str, TrackedSubject] = {}
        self.lost_tracks: Dict[str, dict] = {}
        self.next_id_counter = 1
        self.iou_threshold = iou_threshold
        self.max_staleness_seconds = max_staleness_seconds

    def update_tracks(
        self,
        detections: List[Dict[str, Any]],
        zones: List[Dict[str, Any]],
        frame_w: int = 1280,
        frame_h: int = 720,
        frame: Optional[np.ndarray] = None
    ) -> List[TrackedSubject]:
        now = time.time()

        # Cleanup lost tracks older than 5 seconds
        expired_lost_ids = [tid for tid, t_dict in self.lost_tracks.items() if now - t_dict["expiry_time"] > 5.0]
        for tid in expired_lost_ids:
            del self.lost_tracks[tid]

        # 1. Expire stale tracks not updated within max_staleness_seconds
        expired_ids = [tid for tid, t in self.tracks.items() if now - t.last_seen > self.max_staleness_seconds]
        for tid in expired_ids:
            t = self.tracks[tid]
            if t.last_embedding is not None:
                self.lost_tracks[tid] = {
                    "expiry_time": now,
                    "embedding": t.last_embedding,
                    "zone_entry_time": t.zone_entry_time,
                    "current_zone": t.current_zone,
                    "snapshot_captured": t.snapshot_captured,
                    "snapshot_base64": t.snapshot_base64,
                    "snapshot_timestamp": t.snapshot_timestamp,
                    "face_status": t.face_status,
                    "resident_name": t.resident_name
                }
            del self.tracks[tid]

        if not detections:
            return list(self.tracks.values())

        # 2. IoU Association Matrix
        active_track_keys = list(self.tracks.keys())
        unmatched_detections = set(range(len(detections)))
        matched_tracks = set()

        for det_idx, det in enumerate(detections):
            det_bbox = det.get("bbox")
            if not det_bbox or len(det_bbox) != 4:
                continue
            det_conf = float(det.get("confidence", 0.0))

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
                t.confidence = det_conf
                matched_tracks.add(best_tid)
                unmatched_detections.remove(det_idx)

        # 3. Create new tracks for unmatched detections with Re-ID attempt
        for det_idx in unmatched_detections:
            det = detections[det_idx]
            det_bbox = det.get("bbox")
            if not det_bbox or len(det_bbox) != 4:
                continue
            det_conf = float(det.get("confidence", 0.0))

            matched_zones = check_person_zones(det_bbox, frame_w, frame_h, zones)
            zone_name = matched_zones[0]["name"] if matched_zones else "Outside ROI"
            
            # Re-ID logic
            best_lost_tid = None
            highest_sim = 0.0
            new_emb = None
            if frame is not None:
                x1, y1, x2, y2 = [int(v) for v in det_bbox]
                crop = frame[max(0, y1):min(frame_h, y2), max(0, x1):min(frame_w, x2)]
                if crop.size > 0:
                    new_emb = face_recognizer.generate_embedding(crop)
                    if new_emb and len(new_emb) > 0 and self.lost_tracks:
                        crop_vec = np.array(new_emb)
                        for l_tid, l_data in self.lost_tracks.items():
                            l_vec = np.array(l_data["embedding"])
                            sim = float(np.dot(crop_vec, l_vec) / (np.linalg.norm(crop_vec) * np.linalg.norm(l_vec) + 1e-6))
                            if sim > highest_sim:
                                highest_sim = sim
                                best_lost_tid = l_tid
            
            if best_lost_tid is not None and highest_sim >= 0.7:
                # Re-attach to lost track history!
                track_id = best_lost_tid
                l_data = self.lost_tracks.pop(best_lost_tid)
                new_track = TrackedSubject(track_id, det_bbox, now, zone_name=zone_name, confidence=det_conf)
                # Restore history
                new_track.zone_entry_time = l_data["zone_entry_time"]
                new_track.current_zone = l_data["current_zone"]
                new_track.snapshot_captured = l_data["snapshot_captured"]
                new_track.snapshot_base64 = l_data["snapshot_base64"]
                new_track.snapshot_timestamp = l_data["snapshot_timestamp"]
                new_track.face_status = l_data["face_status"]
                new_track.resident_name = l_data["resident_name"]
                new_track.last_embedding = new_emb
            else:
                track_id = f"#{self.next_id_counter}"
                self.next_id_counter += 1
                new_track = TrackedSubject(track_id, det_bbox, now, zone_name=zone_name, confidence=det_conf)
                new_track.last_embedding = new_emb

            self.tracks[track_id] = new_track

        return list(self.tracks.values())

# Singleton tracker instance used by detection pipeline
tracker_manager = LightweightIoUTracker()
