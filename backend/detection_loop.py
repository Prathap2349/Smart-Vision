import time
import cv2
import json
import threading
import numpy as np
from typing import Dict, Any, Optional, List
from camera.rtsp_stream import rtsp_manager
from ai.detector import yolo_detector
from tracking.tracker import tracker_manager
from face.recognizer import face_recognizer
from face.cache import resident_cache
from ai.decision_engine import decision_engine
from alerts.alert_manager import alert_manager
from database import get_db_connection
from config import TRACK_RECOGNITION_INTERVAL

class ContinuousDetectionLoop(threading.Thread):
    """
    High-Performance Continuous AI Detection Engine.
    
    Optimizations (Phase 1):
    - Zero per-frame SQLite disk I/O
    - In-memory ResidentCache with vectorized ArcFace cosine matching
    - Cached detection zones (reloaded on interval or demand)
    - Track-level face recognition caching (avoids redundant 100ms inference)
    """
    def __init__(self, camera_id: str = "cam-01"):
        super().__init__(daemon=True)
        self.camera_id = camera_id
        self.camera_name = camera_id
        self.running = True
        self.last_detection_state: Dict[str, Any] = {}
        self.lock = threading.Lock()
        self._cached_zones: List[Dict[str, Any]] = []
        self._last_zone_refresh: float = 0.0

    def _refresh_zones_cache(self, force: bool = False):
        """Refreshes detection zones cache from SQLite every 5 seconds or on demand."""
        now = time.time()
        if not force and (now - self._last_zone_refresh) < 5.0 and len(self._cached_zones) > 0:
            return

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, type, dwell_threshold, polygon_json FROM detection_zones WHERE enabled = 1;")
            zone_rows = cursor.fetchall()

            cursor.execute("SELECT name FROM cameras WHERE id = ?;", (self.camera_id,))
            cam_row = cursor.fetchone()
            if cam_row:
                self.camera_name = cam_row["name"]

            conn.close()

            new_zones = []
            for r in zone_rows:
                try:
                    pts = json.loads(r["polygon_json"])
                    new_zones.append({
                        "id": r["id"],
                        "name": r["name"],
                        "type": r["type"],
                        "dwell_threshold": r["dwell_threshold"],
                        "polygonPoints": pts
                    })
                except Exception:
                    pass
            self._cached_zones = new_zones
            self._last_zone_refresh = now
        except Exception as e:
            print(f"[AI Detection Loop] Zone cache refresh warning: {e}")

    def run(self):
        print(f"[AI Detection Loop] Started continuous detection thread for camera '{self.camera_id}'.")
        self._refresh_zones_cache(force=True)

        while self.running:
            try:
                frame, is_connected, fps = rtsp_manager.get_frame_data(self.camera_id)
                if not is_connected or frame is None:
                    time.sleep(0.2)
                    continue

                h, w, _ = frame.shape

                # 1. Run YOLO Human Detection
                detections = yolo_detector.detect(frame)

                # 2. Get Cached Detection Zones (Zero SQLite query per frame)
                self._refresh_zones_cache(force=False)
                zones = self._cached_zones

                # 3. Update Lightweight IoU Multi-Object Tracker
                tracks = tracker_manager.update_tracks(detections, zones, frame_w=w, frame_h=h, frame=frame)

                # 4. Face Recognition & Triple-Gate Rule Evaluation
                gate_eval = {
                    "gate1_human": {"pass": False, "confidence": 0.0, "label": "NO HUMAN"},
                    "gate2_dwell": {"pass": False, "dwell_seconds": 0.0, "threshold_seconds": 20, "label": "0s / 20s"},
                    "gate3_unknown": {"pass": False, "face_status": "NONE", "label": "WAITING"},
                    "final_decision": "CLEAR"
                }

                if tracks:
                    dwell_threshold = 20.0
                    if zones:
                        dwell_threshold = float(zones[0].get("dwell_threshold", 20.0))

                    for t in tracks:
                        x1, y1, x2, y2 = [int(v) for v in t.bbox]
                        crop = frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]

                        # Track-Level Recognition Cache: Run ArcFace only when needed (Single unified pass, 0 duplicate inference)
                        if crop.size > 0 and t.should_verify_face(interval=TRACK_RECOGNITION_INTERVAL):
                            rec = face_recognizer.recognize_face(crop)
                            t.record_face_result(
                                rec["status"],
                                rec["resident_name"],
                                rec["confidence"],
                                embedding=rec["embedding"]
                            )

                        t_gate_eval = decision_engine.evaluate_gates(
                            is_human=True,
                            human_confidence=t.confidence,
                            dwell_seconds=t.dwell_seconds,
                            dwell_threshold=dwell_threshold,
                            face_status=t.face_status
                        )

                        # Trigger Alert if Triple-Gate passes (VERIFIED_THREAT)
                        if t_gate_eval["final_decision"] == "VERIFIED_THREAT":
                            new_alert = alert_manager.trigger_alert(
                                camera_id=self.camera_id,
                                camera_name=self.camera_name,
                                track_id=t.track_id,
                                dwell_duration=t.dwell_seconds,
                                face_status=t.face_status,
                                confidence=t.confidence,
                                frame=frame,
                                zone_name=t.current_zone if t.current_zone != "Outside ROI" else "Corridor Protection Zone"
                            )
                            if new_alert:
                                gate_eval["new_alert"] = new_alert

                    primary_track = max(tracks, key=lambda tr: tr.dwell_seconds)
                    gate_eval = decision_engine.evaluate_gates(
                        is_human=True,
                        human_confidence=primary_track.confidence,
                        dwell_seconds=primary_track.dwell_seconds,
                        dwell_threshold=dwell_threshold,
                        face_status=primary_track.face_status
                    )

                with self.lock:
                    self.last_detection_state = {
                        "camera_id": self.camera_id,
                        "status": "ONLINE" if is_connected else "OFFLINE",
                        "fps": fps,
                        "tracks": [
                            {
                                "track_id": t.track_id,
                                "bbox": t.bbox,
                                "dwell_seconds": t.dwell_seconds,
                                "face_status": t.face_status,
                                "resident_name": t.resident_name,
                                "confidence": t.confidence,
                                "current_zone": t.current_zone
                            }
                            for t in tracks
                        ],
                        "decision": gate_eval,
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                    }

            except Exception as e:
                print(f"[AI Detection Loop Warning]: {e}")

            time.sleep(0.1) # ~10 FPS detection rate

    def stop(self):
        self.running = False

detection_loop = ContinuousDetectionLoop()
