import cv2
import re
import time
import socket
import logging
import threading
import numpy as np
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger("RTSPStreamManager")

_RTSP_CRED_RE = re.compile(r"(rtsp://[^:/@\s]+):([^@\s]+)@")


def mask_rtsp_url(url: str) -> str:
    """Masks password credentials in RTSP URLs for safe logging and health reporting."""
    if not url:
        return ""
    return _RTSP_CRED_RE.sub(r"\1:****@", str(url))


class CameraCaptureThread(threading.Thread):
    def __init__(
        self,
        camera_id: str,
        rtsp_url: str,
        base_backoff: float = 1.0,
        max_backoff: float = 30.0,
    ):
        super().__init__(daemon=True)
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.masked_url = mask_rtsp_url(rtsp_url)
        self.base_backoff = base_backoff
        self.max_backoff = max_backoff
        self.running = True
        self.last_frame: Optional[np.ndarray] = None
        self.measured_fps: float = 0.0
        self.is_connected: bool = False
        self.last_error: Optional[str] = None
        self.reconnect_attempts: int = 0
        self.lock = threading.Lock()

    def _sleep_interruptible(self, seconds: float):
        deadline = time.time() + seconds
        while self.running and time.time() < deadline:
            time.sleep(min(0.1, max(0.0, deadline - time.time())))

    def _next_backoff(self) -> float:
        exponent = min(self.reconnect_attempts, 6)
        delay = min(self.max_backoff, self.base_backoff * (2 ** exponent))
        self.reconnect_attempts += 1
        return delay

    def _open_capture(self, source):
        cap = cv2.VideoCapture(source)
        if isinstance(source, str) and source.startswith("rtsp://"):
            cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 4000)
        return cap

    def run(self):
        source = 0 if self.rtsp_url in ["0", "webcam", "local"] else self.rtsp_url
        cap = self._open_capture(source)

        frame_count = 0
        start_time = time.time()

        while self.running:
            if cap is None or not cap.isOpened():
                self.is_connected = False
                if cap is not None:
                    cap.release()
                self.last_error = f"Unable to open stream {self.masked_url}"
                delay = self._next_backoff()
                logger.warning(
                    "[RTSP %s] %s; retrying in %.1fs (attempt %d)",
                    self.camera_id,
                    self.last_error,
                    delay,
                    self.reconnect_attempts,
                )
                self._sleep_interruptible(delay)
                if not self.running:
                    break
                cap = self._open_capture(source)
                continue

            ret, frame = cap.read()
            if not ret or frame is None:
                self.is_connected = False
                cap.release()
                cap = None
                self.last_error = f"Frame read failed from {self.masked_url}"
                delay = self._next_backoff()
                logger.warning(
                    "[RTSP %s] %s; reconnecting in %.1fs (attempt %d)",
                    self.camera_id,
                    self.last_error,
                    delay,
                    self.reconnect_attempts,
                )
                self._sleep_interruptible(delay)
                if not self.running:
                    break
                cap = self._open_capture(source)
                continue

            self.is_connected = True
            self.last_error = None
            self.reconnect_attempts = 0
            with self.lock:
                self.last_frame = frame.copy()

            frame_count += 1
            elapsed = time.time() - start_time
            if elapsed >= 1.0:
                self.measured_fps = round(frame_count / elapsed, 1)
                frame_count = 0
                start_time = time.time()

            time.sleep(0.01)

        if cap is not None:
            cap.release()

    def get_frame(self) -> Tuple[Optional[np.ndarray], bool, float]:
        with self.lock:
            return self.last_frame, self.is_connected, self.measured_fps

    def get_status(self) -> Dict[str, Any]:
        return {
            "camera_id": self.camera_id,
            "connected": self.is_connected,
            "fps": self.measured_fps if self.is_connected else 0.0,
            "last_error": self.last_error,
            "reconnect_attempts": self.reconnect_attempts,
            "rtsp_url_masked": self.masked_url,
        }

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
        logger.info("[RTSP %s] Started capture for %s", camera_id, mask_rtsp_url(url))

    def stop_camera(self, camera_id: str):
        with self.lock:
            thread = self.threads.pop(camera_id, None)
        if thread:
            thread.stop()
            if thread.is_alive():
                thread.join(timeout=2.0)

    def stop_all(self):
        with self.lock:
            threads = list(self.threads.values())
            self.threads.clear()
        for t in threads:
            t.stop()
        for t in threads:
            if t.is_alive():
                t.join(timeout=2.0)

    def get_frame_data(self, camera_id: str = "cam-01"):
        with self.lock:
            thread = self.threads.get(camera_id)
        if thread:
            with thread.lock:
                return thread.last_frame, thread.is_connected, thread.measured_fps
        return None, False, 0.0

    def get_camera_status(self, camera_id: str) -> Dict[str, Any]:
        with self.lock:
            thread = self.threads.get(camera_id)
        if thread:
            return thread.get_status()
        return {
            "camera_id": camera_id,
            "connected": False,
            "fps": 0.0,
            "last_error": None,
            "reconnect_attempts": 0,
            "rtsp_url_masked": None,
        }

    def get_all_statuses(self) -> Dict[str, Dict[str, Any]]:
        with self.lock:
            items = list(self.threads.items())
        return {cam_id: thread.get_status() for cam_id, thread in items}

    def generate_no_signal_frame(self, camera_name: str = "Residential Corridor") -> np.ndarray:
        width, height = 1280, 720
        frame = np.zeros((height, width, 3), dtype=np.uint8)

        # Grid lines
        for y in range(0, height, 40):
            cv2.line(frame, (0, y), (width, y), (20, 25, 35), 1)
        for x in range(0, width, 40):
            cv2.line(frame, (x, 0), (x, height), (20, 25, 35), 1)

        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(frame, "[ NO CAMERA SIGNAL - RTSP STREAM DISCONNECTED ]", (width // 2 - 420, height // 2 - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
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
                "error": f"RTSP server connected at {mask_rtsp_url(rtsp_url)} but stream unavailable or auth failed.",
                "connected": False
            }
        except Exception:
            return {
                "status": "CONNECTION FAILED",
                "error": f"Failed to decode RTSP video stream at {mask_rtsp_url(rtsp_url)}.",
                "connected": False
            }


rtsp_manager = RTSPStreamManager()
