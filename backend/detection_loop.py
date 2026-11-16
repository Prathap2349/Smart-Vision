import time
import json
import threading
from typing import Dict, Any, Optional, List
from camera.rtsp_stream import rtsp_manager
from ai.detector import yolo_detector
from tracking.tracker import LightweightIoUTracker, TrackedSubject
from face.recognizer import face_recognizer
from ai.decision_engine import decision_engine
from alerts.alert_manager import alert_manager
from database import get_db_connection
from config import TRACK_RECOGNITION_INTERVAL


class ContinuousDetectionLoop(threading.Thread):
    """
    Per-camera continuous AI detection thread.
    Owns an isolated LightweightIoUTracker and detection state for its camera_id.
    """
    def __init__(self, camera_id: str = "cam-01", camera_name: Optional[str] = None):
        super().__init__(daemon=True, name=f"DetectionLoop-{camera_id}")
        self.camera_id = camera_id
        self.camera_name = camera_name or camera_id
        self.tracker = LightweightIoUTracker()
        self.running = False
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
            cursor.execute(
                "SELECT id, name, type, dwell_threshold, polygon_json FROM detection_zones "
                "WHERE enabled = 1 AND (camera_id = ? OR camera_id IS NULL OR camera_id = '');",
                (self.camera_id,),
            )
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
            print(f"[AI Detection Loop {self.camera_id}] Zone cache refresh warning: {e}")

    def process_frame(self, frame, fps: float = 0.0, is_connected: bool = True) -> Dict[str, Any]:
        """Runs one detection/tracking/recognition/decision pass on a frame for this camera."""
        h, w, _ = frame.shape

        # 1. Run YOLO Human Detection
        detections = yolo_detector.detect(frame)

        # 2. Get Cached Detection Zones (Zero SQLite query per frame)
        self._refresh_zones_cache(force=False)
        zones = self._cached_zones

        # 3. Update per-camera Lightweight IoU Multi-Object Tracker
        tracks = self.tracker.update_tracks(detections, zones, frame_w=w, frame_h=h, frame=frame)

        # 4. Face Recognition & Triple-Gate Rule Evaluation
        gate_eval = {
            "gate1_human": {"pass": False, "confidence": 0.0, "label": "NO HUMAN"},
            "gate2_dwell": {"pass": False, "dwell_seconds": 0.0, "threshold_seconds": 20, "label": "0s / 20s"},
            "gate3_unknown": {"pass": False, "face_status": "NONE", "label": "WAITING"},
            "final_decision": "CLEAR"
        }

        if tracks:
            default_zone_threshold = None
            if zones and zones[0].get("dwell_threshold") is not None:
                default_zone_threshold = float(zones[0]["dwell_threshold"])

            for t in tracks:
                matched_zone = next((z for z in zones if z.get("name") == t.current_zone), None)
                track_dwell_threshold = (
                    float(matched_zone["dwell_threshold"])
                    if (matched_zone and matched_zone.get("dwell_threshold") is not None)
                    else default_zone_threshold
                )

                x1, y1, x2, y2 = [int(v) for v in t.bbox]
                crop = frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]

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
                    dwell_threshold=track_dwell_threshold,
                    face_status=t.face_status
                )

                if t_gate_eval["final_decision"] in {"VERIFIED_THREAT", "UNVERIFIED_LOITERER"}:
                    new_alert = alert_manager.trigger_alert(
                        camera_id=self.camera_id,
                        camera_name=self.camera_name,
                        track_id=t.track_id,
                        dwell_duration=t.dwell_seconds,
                        face_status=t.face_status,
                        confidence=t.confidence,
                        frame=frame,
                        zone_name=t.current_zone if t.current_zone != "Outside ROI" else "Corridor Protection Zone",
                        decision=t_gate_eval["final_decision"]
                    )
                    if new_alert:
                        gate_eval["new_alert"] = new_alert

            primary_track = max(tracks, key=lambda tr: tr.dwell_seconds)
            primary_zone = next((z for z in zones if z.get("name") == primary_track.current_zone), None)
            primary_threshold = (
                float(primary_zone["dwell_threshold"])
                if (primary_zone and primary_zone.get("dwell_threshold") is not None)
                else default_zone_threshold
            )
            gate_eval = decision_engine.evaluate_gates(
                is_human=True,
                human_confidence=primary_track.confidence,
                dwell_seconds=primary_track.dwell_seconds,
                dwell_threshold=primary_threshold,
                face_status=primary_track.face_status
            )

        state = {
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
        with self.lock:
            self.last_detection_state = state
        return state

    def run(self):
        self.running = True
        print(f"[AI Detection Loop] Started continuous detection thread for camera '{self.camera_id}'.")
        self._refresh_zones_cache(force=True)

        while self.running:
            try:
                frame, is_connected, fps = rtsp_manager.get_frame_data(self.camera_id)
                if not is_connected or frame is None:
                    time.sleep(0.2)
                    continue
                self.process_frame(frame, fps=fps, is_connected=is_connected)
            except Exception as e:
                print(f"[AI Detection Loop {self.camera_id} Warning]: {e}")

            time.sleep(0.1)  # ~10 FPS detection rate

    def get_state(self) -> Dict[str, Any]:
        with self.lock:
            return dict(self.last_detection_state)

    def get_tracks(self) -> List[TrackedSubject]:
        return list(self.tracker.tracks.values())

    def stop(self):
        self.running = False


class CameraPipeline:
    """
    Encapsulates capture + tracker + detection loop for a single camera_id.
    """
    def __init__(self, camera_id: str, camera_name: Optional[str] = None):
        self.camera_id = camera_id
        self.camera_name = camera_name or camera_id
        self.loop = ContinuousDetectionLoop(camera_id=camera_id, camera_name=self.camera_name)

    @property
    def tracker(self) -> LightweightIoUTracker:
        return self.loop.tracker

    @property
    def last_detection_state(self) -> Dict[str, Any]:
        return self.loop.get_state()

    def start(
        self,
        host: Optional[str] = None,
        port: int = 554,
        username: str = "",
        password: str = "",
        channel: str = "101",
    ):
        if host:
            rtsp_manager.start_camera(self.camera_id, host, port, username, password, channel)
        if not self.loop.is_alive():
            self.loop.start()

    def stop(self, timeout: float = 2.0):
        self.loop.stop()
        rtsp_manager.stop_camera(self.camera_id)
        if self.loop.is_alive():
            self.loop.join(timeout=timeout)

    def get_state(self) -> Dict[str, Any]:
        return self.loop.get_state()

    def get_tracks(self) -> List[TrackedSubject]:
        return self.loop.get_tracks()

    def get_health(self) -> Dict[str, Any]:
        stream_status = rtsp_manager.get_camera_status(self.camera_id)
        state = self.get_state()
        return {
            "camera_id": self.camera_id,
            "camera_name": self.camera_name,
            "loop_running": self.loop.is_alive() and self.loop.running,
            "connected": stream_status.get("connected", False),
            "fps": stream_status.get("fps", 0.0),
            "last_error": stream_status.get("last_error"),
            "active_tracks": len(state.get("tracks", [])),
            "decision": state.get("decision", {}).get("final_decision", "OFFLINE"),
        }


class CameraPipelineRegistry:
    """Registry managing independent CameraPipeline instances per camera_id."""
    def __init__(self):
        self.pipelines: Dict[str, CameraPipeline] = {}
        self.lock = threading.Lock()

    def start_camera(
        self,
        camera_id: str,
        host: Optional[str] = None,
        port: int = 554,
        username: str = "",
        password: str = "",
        channel: str = "101",
        camera_name: Optional[str] = None,
    ) -> CameraPipeline:
        with self.lock:
            existing = self.pipelines.pop(camera_id, None)
        if existing:
            existing.stop()

        pipeline = CameraPipeline(camera_id=camera_id, camera_name=camera_name)
        pipeline.start(host=host, port=port, username=username, password=password, channel=channel)
        with self.lock:
            self.pipelines[camera_id] = pipeline
        return pipeline

    def stop_camera(self, camera_id: str):
        with self.lock:
            pipeline = self.pipelines.pop(camera_id, None)
        if pipeline:
            pipeline.stop()

    def start_all_enabled_cameras(self) -> List[str]:
        started_ids: List[str] = []
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, host, port, username, password, channel FROM cameras WHERE enabled = 1;")
            rows = cursor.fetchall()
            conn.close()
        except Exception as e:
            print(f"[PipelineRegistry] Failed to query enabled cameras: {e}")
            return started_ids

        for r in rows:
            self.start_camera(
                camera_id=r["id"],
                host=r["host"],
                port=int(r["port"] or 554),
                username=r["username"] or "",
                password=r["password"] or "",
                channel=r["channel"] or "101",
                camera_name=r["name"],
            )
            started_ids.append(r["id"])
        return started_ids

    def stop_all(self):
        with self.lock:
            pipelines = list(self.pipelines.values())
            self.pipelines.clear()
        for p in pipelines:
            p.stop()
        rtsp_manager.stop_all()

    def get_pipeline(self, camera_id: str) -> Optional[CameraPipeline]:
        with self.lock:
            return self.pipelines.get(camera_id)

    def get_state(self, camera_id: str) -> Optional[Dict[str, Any]]:
        pipeline = self.get_pipeline(camera_id)
        if not pipeline:
            return None
        state = pipeline.get_state()
        return state if state else None

    def get_tracks(self, camera_id: str) -> List[TrackedSubject]:
        pipeline = self.get_pipeline(camera_id)
        if pipeline:
            return pipeline.get_tracks()
        return []

    def get_all_health(self) -> Dict[str, Dict[str, Any]]:
        with self.lock:
            items = list(self.pipelines.items())
        return {cam_id: p.get_health() for cam_id, p in items}


pipeline_registry = CameraPipelineRegistry()
# Backward-compatible default loop reference
detection_loop = ContinuousDetectionLoop(camera_id="cam-01")
