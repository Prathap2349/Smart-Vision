import time
import cv2
import threading
import numpy as np
from typing import Dict, Any, Optional
from camera.rtsp_stream import rtsp_manager
from ai.detector import yolo_detector
from tracking.tracker import tracker_manager
from face.recognizer import face_recognizer
from ai.decision_engine import decision_engine
from alerts.alert_manager import alert_manager
from database import get_db_connection

class ContinuousDetectionLoop(threading.Thread):
    def __init__(self, camera_id: str = "cam-01"):
        super().__init__(daemon=True)
        self.camera_id = camera_id
        self.running = True
        self.last_detection_state: Dict[str, Any] = {}
        self.lock = threading.Lock()

    def run(self):
        print(f"[AI Detection Loop] Started continuous detection thread for camera '{self.camera_id}'.")
        while self.running:
            try:
                frame, is_connected, fps = rtsp_manager.get_frame_data(self.camera_id)
                if not is_connected or frame is None:
                    time.sleep(0.2)
                    continue

                h, w, _ = frame.shape

                # 1. Run YOLO Human Detection
                detections = yolo_detector.detect(frame)

                # 2. Query Active Zones from SQLite
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT id, name, type, dwell_threshold, polygon_json FROM detection_zones WHERE enabled = 1;")
                zone_rows = cursor.fetchall()
                conn.close()

                zones = []
                for r in zone_rows:
                    import json
                    try:
                        pts = json.loads(r["polygon_json"])
                        zones.append({
                            "id": r["id"],
                            "name": r["name"],
                            "type": r["type"],
                            "dwell_threshold": r["dwell_threshold"],
                            "polygonPoints": pts
                        })
                    except Exception:
                        pass

                # 3. Update Lightweight IoU Multi-Object Tracker
                tracks = tracker_manager.update_tracks(detections, zones, frame_w=w, frame_h=h)

                # 4. Face Recognition & Triple-Gate Rule Evaluation
                gate_eval = {
                    "gate1_human": {"pass": False, "confidence": 0.0, "label": "NO HUMAN"},
                    "gate2_dwell": {"pass": False, "dwell_seconds": 0.0, "threshold_seconds": 20, "label": "0s / 20s"},
                    "gate3_unknown": {"pass": False, "face_status": "NONE", "label": "WAITING"},
                    "final_decision": "CLEAR"
                }

                if tracks:
                    active_track = tracks[0]
                    # Crop person box for face matching
                    x1, y1, x2, y2 = [int(v) for v in active_track.bbox]
                    crop = frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]
                    
                    if crop.size > 0:
                        face_status, res_name, face_conf = face_recognizer.match_face(crop)
                        active_track.face_status = face_status
                        active_track.resident_name = res_name

                    dwell_threshold = 20.0
                    if zones:
                        dwell_threshold = float(zones[0].get("dwell_threshold", 20.0))

                    gate_eval = decision_engine.evaluate_gates(
                        is_human=True,
                        human_confidence=active_track.confidence,
                        dwell_seconds=active_track.dwell_seconds,
                        dwell_threshold=dwell_threshold,
                        face_status=active_track.face_status
                    )

                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute("SELECT name FROM cameras WHERE id = ?;", (self.camera_id,))
                    cam_row = cursor.fetchone()
                    conn.close()
                    camera_name = cam_row["name"] if cam_row else self.camera_id

                    # Trigger Alert if Triple-Gate passes (VERIFIED_THREAT)
                    if gate_eval["final_decision"] == "VERIFIED_THREAT":
                        new_alert = alert_manager.trigger_alert(
                            camera_id=self.camera_id,
                            camera_name=camera_name,
                            track_id=active_track.track_id,
                            dwell_duration=active_track.dwell_seconds,
                            face_status=active_track.face_status,
                            confidence=active_track.confidence,
                            frame=frame
                        )
                        if new_alert:
                            gate_eval["new_alert"] = new_alert

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
