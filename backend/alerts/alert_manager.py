import cv2
import time
import uuid
import datetime
import requests
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from config import EVIDENCE_DIR, ALERT_COOLDOWN_SECONDS, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
from database import get_db_connection

def send_telegram_alert(message: str, photo_path: Optional[str] = None) -> Tuple[bool, float, str]:
    """
    Real Telegram sender function calling Telegram Bot API.
    Returns (telegram_delivered: bool, latency_seconds: float, status_reason: str)
    """
    # Honest fix: Was previously hardcoded as delivered=True, latency=1.3 without performing actual Telegram API request.
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False, 0.0, "NOT_CONFIGURED"

    start_time = time.time()
    try:
        if photo_path and Path(photo_path).exists():
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
            with open(photo_path, "rb") as photo_file:
                resp = requests.post(
                    url,
                    data={"chat_id": TELEGRAM_CHAT_ID, "caption": message},
                    files={"photo": photo_file},
                    timeout=5.0
                )
        else:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
            resp = requests.post(
                url,
                json={"chat_id": TELEGRAM_CHAT_ID, "text": message},
                timeout=5.0
            )

        latency = round(time.time() - start_time, 2)
        if resp.status_code == 200:
            return True, latency, "SUCCESS"
        else:
            return False, latency, f"TELEGRAM_API_ERROR_{resp.status_code}"
    except Exception:
        latency = round(time.time() - start_time, 2)
        return False, latency, "TELEGRAM_API_ERROR"

class AlertManager:
    def __init__(self):
        self.last_alert_time: Dict[str, float] = {}

    def should_fire_alert(self, track_id: str) -> bool:
        now = time.time()
        last = self.last_alert_time.get(track_id, 0)
        if (now - last) >= ALERT_COOLDOWN_SECONDS:
            self.last_alert_time[track_id] = now
            return True
        return False

    def trigger_alert(
        self,
        camera_id: str,
        camera_name: str,
        track_id: str,
        dwell_duration: float,
        face_status: str,
        confidence: float,
        frame: Optional[Any] = None,
        zone_name: str = "Corridor Protection Zone"
    ) -> Optional[Dict[str, Any]]:

        if not self.should_fire_alert(track_id):
            return None

        alert_id = f"alt-{uuid.uuid4().hex[:6]}"
        now_dt = datetime.datetime.now()
        timestamp_str = now_dt.isoformat()

        # Build evidence snapshot folder: /data/evidence/YYYY/MM/DD/
        date_dir = EVIDENCE_DIR / now_dt.strftime("%Y") / now_dt.strftime("%m") / now_dt.strftime("%d")
        date_dir.mkdir(parents=True, exist_ok=True)
        snapshot_filename = f"{alert_id}.jpg"
        snapshot_path = date_dir / snapshot_filename

        # Save actual JPEG image frame if available
        if frame is not None and frame.size > 0:
            cv2.imwrite(str(snapshot_path), frame)
        else:
            # Honest fix: cv2.Mat.zeros does not exist in OpenCV Python bindings; replace with np.zeros
            placeholder = np.zeros((720, 1280, 3), dtype=np.uint8)
            cv2.putText(placeholder, f"EVIDENCE SNAPSHOT {alert_id}", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 2)
            cv2.imwrite(str(snapshot_path), placeholder)

        # Send real Telegram alert
        telegram_delivered, telegram_latency, telegram_status_reason = send_telegram_alert(
            message=f"🚨 SECURITY ALERT: {camera_name} - Unknown Person Loitering ({zone_name})",
            photo_path=str(snapshot_path)
        )

        # Store alert in SQLite database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO alerts (
            id, camera_id, camera_name, track_id, detection_type, dwell_duration,
            face_status, confidence, severity, status, snapshot_path, telegram_delivered,
            telegram_latency, zone_name, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            alert_id, camera_id, camera_name, track_id, "Unknown Person Loitering",
            dwell_duration, face_status, confidence, "CRITICAL", "ACTIVE",
            f"/api/evidence/{now_dt.strftime('%Y/%m/%d')}/{snapshot_filename}",
            1 if telegram_delivered else 0, telegram_latency, zone_name, timestamp_str
        ))

        # Insert audit log event
        cursor.execute("""
        INSERT INTO events (id, timestamp, camera_id, camera_name, track_id, person_type, event_type, confidence, severity, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            f"evt-{uuid.uuid4().hex[:6]}", timestamp_str, camera_id, camera_name, track_id,
            "Unknown Person", "Threat verified", confidence, "CRITICAL", "ALERT SENT"
        ))

        conn.commit()
        conn.close()

        return {
            "id": alert_id,
            "timestamp": timestamp_str,
            "cameraName": camera_name,
            "cameraId": camera_id,
            "personTrackId": track_id,
            "detectionType": "Unknown Person Loitering",
            "dwellDuration": dwell_duration,
            "faceStatus": face_status,
            "confidence": confidence,
            "severity": "CRITICAL",
            "status": "ACTIVE",
            "snapshotUrl": f"/api/evidence/{now_dt.strftime('%Y/%m/%d')}/{snapshot_filename}",
            "telegramDelivered": telegram_delivered,
            "telegramLatency": telegram_latency,
            "telegramStatusReason": telegram_status_reason,
            "zoneName": zone_name,
            "aiReasoning": {
                "gate1Human": True,
                "gate2Dwell": True,
                "gate3Unknown": True
            }
        }

alert_manager = AlertManager()

