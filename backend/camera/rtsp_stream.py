import cv2
import time
import socket
import threading
import numpy as np
from typing import Dict, Any, Optional, Tuple

class CameraCaptureThread(threading.Thread):
    def __init__(self, camera_id: str, rtsp_url: str):
        super().__init__(daemon=True)
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.running = True
        self.last_frame: Optional[np.ndarray] = None
        self.measured_fps: float = 0.0
        self.is_connected: bool = False
        self.lock = threading.Lock()

    def run(self):
        source = 0 if self.rtsp_url in ["0", "webcam", "local"] else self.rtsp_url
        cap = cv2.VideoCapture(source)
        if isinstance(source, str) and source.startswith("rtsp://"):
            cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 4000)

        frame_count = 0
        start_time = time.time()

        while self.running:
            if not cap.isOpened():
                self.is_connected = False
                time.sleep(1.0)
                cap = cv2.VideoCapture(source)
                continue

            ret, frame = cap.read()
            if not ret or frame is None:
                self.is_connected = False
                time.sleep(0.5)
                continue

            self.is_connected = True
            with self.lock:
                self.last_frame = frame.copy()

            frame_count += 1
            elapsed = time.time() - start_time
            if elapsed >= 1.0:
                self.measured_fps = round(frame_count / elapsed, 1)
                frame_count = 0
                start_time = time.time()

            time.sleep(0.01)

        cap.release()

    def get_frame(self) -> Tuple[Optional[np.ndarray], bool, float]:
        with self.lock:
            return self.last_frame, self.is_connected, self.measured_fps

    def stop(self):
        self.running = False


class RTSPStreamManager:
    def __init__(self):
        self.threads: Dict[str, CameraCaptureThread] = {}
        self.lock = threading.Lock()

    def build_rtsp_url(self, host: str, port: int, username: str, password: str, channel: str = "101") -> str:
        if host in ["0", "webcam", "local"]:
            return "0"
        return f"rtsp://{username}:{password}@{host}:{port}/Streaming/channels/{channel}"

    def start_camera(self, camera_id: str, host: str, port: int, username: str, password: str, channel: str = "101"):
        url = self.build_rtsp_url(host, port, username, password, channel)
        with self.lock:
            if camera_id in self.threads:
                self.threads[camera_id].stop()
            thread = CameraCaptureThread(camera_id, url)
            self.threads[camera_id] = thread
            thread.start()

    def get_frame_data(self, camera_id: str = "cam-01"):
        with self.lock:
            thread = self.threads.get(camera_id)
        if thread:
            with thread.lock:
                return thread.last_frame, thread.is_connected, thread.measured_fps
        return None, False, 0.0

    def generate_no_signal_frame(self, camera_name: str = "Residential Corridor") -> np.ndarray:
        width, height = 1280, 720
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Grid lines
        for y in range(0, height, 40):
            cv2.line(frame, (0, y), (width, y), (20, 25, 35), 1)
        for x in range(0, width, 40):
            cv2.line(frame, (x, 0), (x, height), (20, 25, 35), 1)

        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(frame, "NO CAMERA SIGNAL", (width // 2 - 200, height // 2 - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)
        cv2.putText(frame, f"CAMERA: {camera_name.upper()} | STATUS: DISCONNECTED", (width // 2 - 240, height // 2 + 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
        cv2.putText(frame, f"CONNECT RTSP / WEBCAM | {timestamp}", (width // 2 - 230, height // 2 + 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 100), 1)

        return frame

    def test_connection(self, host: str, port: int, username: str, password: str, channel: str = "101") -> Dict[str, Any]:
        if host in ["0", "webcam", "local"]:
            try:
                cap = cv2.VideoCapture(0)
                if cap.isOpened():
                    ret, frame = cap.read()
                    cap.release()
                    if ret and frame is not None:
                        return {
                            "status": "CONNECTED",
                            "message": f"✓ Local Camera Connected! Resolution {frame.shape[1]}x{frame.shape[0]}.",
                            "connected": True,
                            "resolution": f"{frame.shape[1]}x{frame.shape[0]}"
                        }
                cap.release()
            except Exception:
                pass
            return {
                "status": "CONNECTION FAILED",
                "error": "Local camera permission denied or device busy.",
                "connected": False
            }

        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2.5)
            result = sock.connect_ex((host, int(port)))
            sock.close()
            if result != 0:
                return {
                    "status": "CONNECTION FAILED",
                    "error": f"Port {port} on {host} is unreachable. Check local IP.",
                    "connected": False
                }
        except Exception:
            return {
                "status": "CONNECTION FAILED",
                "error": f"Network socket error connecting to {host}:{port}.",
                "connected": False
            }

        rtsp_url = self.build_rtsp_url(host, port, username, password, channel)
        try:
            cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
            cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 3000)
            if cap.isOpened():
                ret, frame = cap.read()
                cap.release()
                if ret and frame is not None:
                    return {
                        "status": "CONNECTED",
                        "message": "✓ RTSP Connection Successful! Stream responsive.",
                        "connected": True,
                        "resolution": f"{frame.shape[1]}x{frame.shape[0]}"
                    }
            cap.release()
            return {
                "status": "CONNECTION FAILED",
                "error": "RTSP server connected but stream unavailable or auth failed.",
                "connected": False
            }
        except Exception:
            return {
                "status": "CONNECTION FAILED",
                "error": "Failed to decode RTSP video stream.",
                "connected": False
            }

rtsp_manager = RTSPStreamManager()
