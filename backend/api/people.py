import json
import uuid
import datetime
import base64
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from database import get_db_connection
from face.recognizer import face_recognizer

router = APIRouter(prefix="/api/people", tags=["people"])

class ResidentCreate(BaseModel):
    name: str
    role: str = "Family Member"
    avatar_url: Optional[str] = None
    face_image_base64: Optional[str] = None

@router.get("")
def get_people():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Honest fix: Query real residents without stock photo fallbacks or fake "12 mins ago" strings
    cursor.execute("""
    SELECT id, name, resident_id, role, face_status, avatar_url, last_detected, detection_count, added_date
    FROM residents;
    """)
    res_rows = cursor.fetchall()

    residents = [
        {
            "id": r["id"],
            "name": r["name"],
            "residentId": r["resident_id"],
            "role": r["role"],
            "faceStatus": r["face_status"],
            "avatarUrl": r["avatar_url"],
            "lastDetected": r["last_detected"],
            "detectionCount": r["detection_count"],
            "addedDate": r["added_date"]
        }
        for r in res_rows
    ]

    # Honest fix: Query real UNKNOWN alerts instead of hardcoding fake 'unk-104' object
    cursor.execute("""
    SELECT id, track_id, timestamp, camera_name, confidence, severity, snapshot_path, dwell_duration
    FROM alerts
    WHERE face_status = 'UNKNOWN'
    ORDER BY timestamp DESC;
    """)
    alert_rows = cursor.fetchall()
    conn.close()

    unknowns = [
        {
            "id": r["id"],
            "trackId": f"#{r['track_id']}" if not str(r["track_id"]).startswith("#") else str(r["track_id"]),
            "firstSeen": r["timestamp"],
            "lastSeen": r["timestamp"],
            "camera": r["camera_name"],
            "confidence": r["confidence"],
            "threatStatus": r["severity"],
            "snapshotUrl": r["snapshot_path"],
            "dwellSeconds": r["dwell_duration"]
        }
        for r in alert_rows
    ]

    return {
        "residents": residents,
        "unknownPersons": unknowns
    }

@router.post("")
def add_resident(req: ResidentCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    res_id = f"res-{uuid.uuid4().hex[:6]}"
    resident_code = f"RES-{uuid.uuid4().hex[:4].upper()}"
    today_str = datetime.date.today().isoformat()

    embedding_json = None
    face_status = "PENDING_ENROLLMENT"

    # Honest fix: Extract feature embedding from actual base64 face photo if provided.
    # If no photo provided, set face_status to PENDING_ENROLLMENT and embedding_json to NULL instead of generating fake random vectors.
    if req.face_image_base64:
        try:
            image_data = req.face_image_base64
            if "," in image_data:
                image_data = image_data.split(",", 1)[1]
            img_bytes = base64.b64decode(image_data)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img is not None:
                embedding_vec = face_recognizer.generate_embedding(img)
                if embedding_vec:
                    embedding_json = json.dumps(embedding_vec)
                    face_status = "VERIFIED"
        except Exception:
            pass

    cursor.execute("""
    INSERT INTO residents (id, name, resident_id, role, face_status, avatar_url, embedding_json, last_detected, detection_count, added_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, ?);
    """, (res_id, req.name, resident_code, req.role, face_status, req.avatar_url, embedding_json, today_str))

    conn.commit()
    conn.close()

    return {
        "id": res_id,
        "name": req.name,
        "residentId": resident_code,
        "role": req.role,
        "faceStatus": face_status,
        "message": f"Resident {req.name} added with face status: {face_status}."
    }

@router.delete("/{id}")
def delete_resident(id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM residents WHERE id = ?;", (id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": f"Resident {id} removed."}

