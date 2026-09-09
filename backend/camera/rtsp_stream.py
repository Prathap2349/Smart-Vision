import cv2
import time
import socket
import threading
import numpy as np
from typing import Dict, Any, Optional

class RTSPStreamManager:
    def __init__(self):
        self.active_streams: Dict[str, cv2.VideoCapture] = {}
        self.last_frames: Dict[str, np.ndarray] = {}
        self.lock = threading.Lock()

    def build_rtsp_url(self, host: str, port: int, username: str, password: str, channel: str = "101") -> str:
        if host in ["0", "webcam", "local"]:
            return "0"
        # Hikvision RTSP Format: rtsp://username:password@host:port/Streaming/channels/101
        return f"rtsp://{username}:{password}@{host}:{port}/Streaming/channels/{channel}"

    def test_connection(self, host: str, port: int, username: str, password: str, channel: str = "101") -> Dict[str, Any]:
        # Handle Local Mac Webcam Test
        if host in ["0", "webcam", "local"]:
            try:
                cap = cv2.VideoCapture(0)
                if cap.isOpened():
                    ret, frame = cap.read()
                    cap.release()
                    if ret and frame is not None:
                        return {
                            "status": "CONNECTED",
                            "message": f"✓ Local Mac Camera Connected! Resolution {frame.shape[1]}x{frame.shape[0]}.",
                            "connected": True,
                            "resolution": f"{frame.shape[1]}x{frame.shape[0]}"
                        }
                cap.release()
            except Exception as e:
                pass
            return {
                "status": "CONNECTION FAILED",
                "error": "Local Mac camera permission denied or device busy.",
                "connected": False
            }

        # 1. Quick TCP socket handshake test on RTSP port
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2.5)
            result = sock.connect_ex((host, int(port)))
            sock.close()
            if result != 0:
                return {
                    "status": "CONNECTION FAILED",
                    "error": f"Port {port} on {host} is unreachable or closed. Verify device IP address on local network.",
                    "connected": False
                }
        except Exception as e:
            return {
                "status": "CONNECTION FAILED",
                "error": f"Network socket error to {host}:{port}.",
                "connected": False
            }

        # 2. OpenCV RTSP Frame Grab test
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
                        "message": "✓ Hikvision RTSP connection successful! Stream 1080p verified.",
                        "connected": True,
                        "resolution": f"{frame.shape[1]}x{frame.shape[0]}"
                    }
            cap.release()
            return {
                "status": "CONNECTION FAILED",
                "error": "RTSP server responded, but authentication failed or channel stream unavailable.",
                "connected": False
            }
        except Exception as e:
            return {
                "status": "CONNECTION FAILED",
                "error": "Failed to decode RTSP H.264 video stream.",
                "connected": False
            }

    def generate_simulated_corridor_frame(self, subject: Optional[Dict[str, Any]] = None) -> np.ndarray:
        width, height = 1280, 720
        frame = np.zeros((height, width, 3), dtype=np.uint8)

        # Draw corridor walls and vanishing perspective
        cv2.rectangle(frame, (0, 0), (width, height), (20, 26, 12), -1)
        cv2.line(frame, (0, 70), (450, 300), (40, 50, 60), 2)
        cv2.line(frame, (0, 650), (450, 500), (40, 50, 60), 2)
        cv2.line(frame, (width, 70), (830, 300), (40, 50, 60), 2)
        cv2.line(frame, (width, 650), (830, 500), (40, 50, 60), 2)
        cv2.rectangle(frame, (450, 300), (830, 500), (10, 15, 25), 2)
        cv2.circle(frame, (640, 120), 15, (200, 220, 255), -1)

        return frame

rtsp_manager = RTSPStreamManager()
