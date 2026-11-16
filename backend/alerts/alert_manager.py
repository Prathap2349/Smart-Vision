import cv2
import time
import uuid
import queue
import threading
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


class TelegramAlertDispatcher:
    """
    Non-blocking asynchronous Telegram notification dispatcher with a bounded queue and retry worker.
    Ensures the real-time detection loop never blocks on network I/O.
    """
    def __init__(self, max_queue_size: int = 100, max_retries: int = 3, retry_backoff_seconds: float = 0.25):
        self.queue: "queue.Queue[Optional[Dict[str, Any]]]" = queue.Queue(maxsize=max_queue_size)
        self.max_retries = max_retries
        self.retry_backoff_seconds = retry_backoff_seconds
        self.running = True
        self._worker = threading.Thread(target=self._run_worker, daemon=True, name="TelegramAlertWorker")
        self._worker.start()

    def enqueue(self, alert_id: str, message: str, photo_path: Optional[str] = None) -> Tuple[bool, str]:
        if not self.running:
            return False, "DISPATCHER_STOPPED"
        item = {
            "alert_id": alert_id,
            "message": message,
            "photo_path": photo_path,
        }
        try:
            self.queue.put_nowait(item)
            return True, "QUEUED"
        except queue.Full:
            return False, "QUEUE_FULL"

    def _deliver_with_retry(self, message: str, photo_path: Optional[str]) -> Tuple[bool, float, str]:
        delivered = False
        latency = 0.0
        reason = "NOT_CONFIGURED"

        for attempt in range(1, self.max_retries + 1):
            delivered, latency, reason = send_telegram_alert(message=message, photo_path=photo_path)
            if delivered or reason == "NOT_CONFIGURED":
                return delivered, latency, reason
            if attempt < self.max_retries:
                time.sleep(self.retry_backoff_seconds * (2 ** (attempt - 1)))

        return delivered, latency, reason

    def _run_worker(self):
        while self.running:
            try:
                item = self.queue.get(timeout=0.2)
            except queue.Empty:
                continue

            if item is None:
                self.queue.task_done()
                break

            try:
                alert_id = item["alert_id"]
                delivered, latency, _ = self._deliver_with_retry(
                    message=item["message"],
                    photo_path=item.get("photo_path"),
                )
                try:
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute(
                        "UPDATE alerts SET telegram_delivered = ?, telegram_latency = ? WHERE id = ?;",
                        (1 if delivered else 0, latency, alert_id),
                    )
                    conn.commit()
                    conn.close()
                except Exception:
                    pass
            finally:
                self.queue.task_done()

    def flush(self, timeout: float = 2.0) -> bool:
        """Waits up to timeout seconds for all queued notifications to finish processing."""
        deadline = time.time() + timeout
        while self.queue.unfinished_tasks > 0 and time.time() < deadline:
            time.sleep(0.01)
        return self.queue.unfinished_tasks == 0

    def stop(self, timeout: float = 2.0):
        self.running = False
        try:
            self.queue.put_nowait(None)
        except queue.Full:
            pass
        if self._worker.is_alive():
            self._worker.join(timeout=timeout)


class AlertManager:
    def __init__(self, max_queue_size: int = 100, max_retries: int = 3, retry_backoff_seconds: float = 0.25):
        self.last_alert_time: Dict[str, float] = {}
        self.dispatcher = TelegramAlertDispatcher(
            max_queue_size=max_queue_size,
            max_retries=max_retries,
            retry_backoff_seconds=retry_backoff_seconds,
        )

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
        zone_name: str = "Corridor Protection Zone",
        decision: str = "VERIFIED_THREAT"
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
            placeholder = np.zeros((720, 1280, 3), dtype=np.uint8)
            cv2.putText(placeholder, f"EVIDENCE SNAPSHOT {alert_id}", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 2)
            cv2.imwrite(str(snapshot_path), placeholder)

        unverified = decision == "UNVERIFIED_LOITERER"
        detection_type = "Unverified Loiterer (face not visible)" if unverified else "Unknown Person Loitering"
        severity = "HIGH" if unverified else "CRITICAL"

        # Store alert in SQLite database first so background worker can update delivery status
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO alerts (
            id, camera_id, camera_name, track_id, detection_type, dwell_duration,
            face_status, confidence, severity, status, snapshot_path, telegram_delivered,
            telegram_latency, zone_name, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            alert_id, camera_id, camera_name, track_id, detection_type,
            dwell_duration, face_status, confidence, severity, "ACTIVE",
            f"/api/evidence/{now_dt.strftime('%Y/%m/%d')}/{snapshot_filename}",
            0, 0.0, zone_name, timestamp_str
        ))

        # Insert audit log event
        event_type = "Unverified loiterer (face not visible)" if unverified else "Threat verified"
        cursor.execute("""
        INSERT INTO events (id, timestamp, camera_id, camera_name, track_id, person_type, event_type, confidence, severity, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            f"evt-{uuid.uuid4().hex[:6]}", timestamp_str, camera_id, camera_name, track_id,
            "Unknown Person", event_type, confidence, severity, "ALERT SENT"
        ))

        conn.commit()
        conn.close()

        # Enqueue non-blocking Telegram notification (never blocks detection loop on network)
        enqueued, telegram_status_reason = self.dispatcher.enqueue(
            alert_id=alert_id,
            message=f"🚨 SECURITY ALERT: {camera_name} - {detection_type} ({zone_name})",
            photo_path=str(snapshot_path)
        )

        return {
            "id": alert_id,
            "timestamp": timestamp_str,
            "cameraName": camera_name,
            "cameraId": camera_id,
            "personTrackId": track_id,
            "detectionType": detection_type,
            "dwellDuration": dwell_duration,
            "faceStatus": face_status,
            "confidence": confidence,
            "severity": severity,
            "status": "ACTIVE",
            "snapshotUrl": f"/api/evidence/{now_dt.strftime('%Y/%m/%d')}/{snapshot_filename}",
            "telegramDelivered": False,
            "telegramQueued": enqueued,
            "telegramLatency": 0.0,
            "telegramStatusReason": telegram_status_reason,
            "zoneName": zone_name,
            "aiReasoning": {
                "gate1Human": True,
                "gate2Dwell": True,
                "gate3Unknown": True
            }
        }

    def stop(self):
        self.dispatcher.stop()


alert_manager = AlertManager()
