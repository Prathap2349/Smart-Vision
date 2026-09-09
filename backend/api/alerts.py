import json
import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db_connection

router = APIRouter(tags=["alerts"])

class FeedbackRequest(BaseModel):
    reason: str

@router.get("/api/alerts")
def get_alerts():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, camera_id, camera_name, track_id, detection_type, dwell_duration,
           face_status, resident_name, confidence, severity, status, snapshot_path,
           telegram_delivered, telegram_latency, false_positive_reason,
           false_positive_timestamp, zone_name, timestamp
    FROM alerts ORDER BY timestamp DESC;
    """)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        reasoning_summary = (
            f"🚨 Threat Alert: {r['detection_type']} at {r['camera_name']} ({r['zone_name']}). "
            f"Human detected ({int(r['confidence'] * 100)}%), dwelt for {int(r['dwell_duration'])}s, "
            f"face status: {r['face_status']}."
        )
        result.append({
            "id": r["id"],
            "timestamp": r["timestamp"],
            "cameraName": r["camera_name"],
            "cameraId": r["camera_id"],
            "personTrackId": r["track_id"],
            "detectionType": r["detection_type"],
            "dwellDuration": r["dwell_duration"],
            "faceStatus": r["face_status"],
            "residentName": r["resident_name"],
            "confidence": r["confidence"],
            "severity": r["severity"],
            "status": r["status"],
            "snapshotUrl": r["snapshot_path"],
            "telegramDelivered": bool(r["telegram_delivered"]),
            "telegramLatency": r["telegram_latency"],
            "falsePositiveReason": r["false_positive_reason"],
            "falsePositiveTimestamp": r["false_positive_timestamp"],
            "zoneName": r["zone_name"],
            "aiReasoningSummary": reasoning_summary,
            "aiReasoning": {
                "gate1Human": True,
                "gate2Dwell": True,
                "gate3Unknown": r["face_status"] == "UNKNOWN"
            }
        })
    return result

# Idea 4: Confirmation Loop — Confirm Alert Endpoint
@router.post("/api/alerts/{id}/confirm")
def confirm_alert(id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.datetime.now().isoformat()
    cursor.execute("UPDATE alerts SET status = 'CONFIRMED_THREAT' WHERE id = ?;", (id,))
    conn.commit()
    conn.close()
    return {
        "success": True,
        "message": f"Alert {id} confirmed by resident as real security threat.",
        "status": "CONFIRMED_THREAT",
        "timestamp": now_str
    }

# Idea 4: Confirmation Loop — Dismiss Alert Endpoint
@router.post("/api/alerts/{id}/dismiss")
def dismiss_alert(id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.datetime.now().isoformat()
    cursor.execute("UPDATE alerts SET status = 'DISMISSED' WHERE id = ?;", (id,))
    conn.commit()
    conn.close()
    return {
        "success": True,
        "message": f"Alert {id} dismissed by resident (1-tap confirmation loop).",
        "status": "DISMISSED",
        "timestamp": now_str
    }

@router.post("/api/alerts/{id}/feedback")
def submit_feedback(id: str, req: FeedbackRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.datetime.now().isoformat()
    cursor.execute("""
    UPDATE alerts SET status = 'FALSE_POSITIVE', false_positive_reason = ?, false_positive_timestamp = ?
    WHERE id = ?;
    """, (req.reason, now_str, id))
    conn.commit()
    conn.close()
    return {
        "success": True,
        "message": "Feedback recorded for threshold analysis.",
        "reason": req.reason,
        "timestamp": now_str
    }

@router.get("/api/events")
def get_events():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, timestamp, camera_name, track_id, person_type, event_type, confidence, severity, status
    FROM events ORDER BY timestamp DESC;
    """)
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r["id"],
            "timestamp": r["timestamp"],
            "camera": r["camera_name"],
            "trackId": r["track_id"],
            "personType": r["person_type"],
            "eventType": r["event_type"],
            "confidence": r["confidence"],
            "severity": r["severity"],
            "status": r["status"]
        }
        for r in rows
    ]

