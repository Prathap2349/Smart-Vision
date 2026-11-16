import json
import time
import uuid
import datetime
import base64
import threading
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Tuple
from database import get_db_connection
from face.recognizer import face_recognizer
from face.cache import resident_cache
import config
from config import INSIGHTFACE_MODEL_NAME
from services.security import sign_evidence_url

router = APIRouter(prefix="/api/people", tags=["people"])

ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
_enrollment_rate_lock = threading.Lock()
_enrollment_requests_by_ip: Dict[str, List[float]] = {}


def reset_enrollment_rate_limiter():
    with _enrollment_rate_lock:
        _enrollment_requests_by_ip.clear()


def _enforce_enrollment_rate_limit(request: Optional[Request]):
    limit = int(getattr(config, "ENROLLMENT_RATE_LIMIT_PER_MIN", 10))
    if limit <= 0:
        return
    client_ip = "local"
    if request is not None and request.client and request.client.host:
        client_ip = request.client.host
    now = time.time()
    window_start = now - 60.0
    with _enrollment_rate_lock:
        timestamps = [ts for ts in _enrollment_requests_by_ip.get(client_ip, []) if ts > window_start]
        if len(timestamps) >= limit:
            _enrollment_requests_by_ip[client_ip] = timestamps
            raise HTTPException(
                status_code=429,
                detail="Too many enrollment requests. Please wait before retrying.",
            )
        timestamps.append(now)
        _enrollment_requests_by_ip[client_ip] = timestamps


def _has_valid_image_magic(img_bytes: bytes) -> bool:
    if len(img_bytes) < 12:
        return False
    # JPEG: FF D8 FF
    if img_bytes[:3] == b"\xff\xd8\xff":
        return True
    # PNG: 89 50 4E 47 0D 0A 1A 0A
    if img_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        return True
    # WebP: RIFF....WEBP
    if img_bytes[:4] == b"RIFF" and img_bytes[8:12] == b"WEBP":
        return True
    return False


class ResidentCreate(BaseModel):
    name: str
    role: str = "Family Member"
    avatar_url: Optional[str] = None
    face_image_base64: Optional[str] = None
    face_images_base64: Optional[List[str]] = None


class ReEnrollRequest(BaseModel):
    face_images_base64: Optional[List[str]] = None
    face_image_base64: Optional[str] = None


def _process_enrollment_images(images_base64: List[str]) -> Tuple[List[List[float]], Optional[str]]:
    """
    Validates upload count, byte size, MIME/magic-byte format, and extracts 512-D ArcFace embeddings.
    Returns:
        (embeddings_list, error_message_if_any)
    """
    max_photos = int(getattr(config, "MAX_ENROLLMENT_PHOTOS", 10))
    max_bytes = int(getattr(config, "MAX_ENROLLMENT_IMAGE_BYTES", 5 * 1024 * 1024))

    non_empty_photos = [p for p in images_base64 if p and isinstance(p, str)]
    if len(non_empty_photos) > max_photos:
        return [], f"Too many photos uploaded ({len(non_empty_photos)}). Maximum allowed is {max_photos}."

    valid_embeddings: List[List[float]] = []

    for idx, raw_b64 in enumerate(non_empty_photos):
        try:
            if "," in raw_b64:
                header, clean_b64 = raw_b64.split(",", 1)
                if header.startswith("data:") and ";base64" in header:
                    mime = header[5:header.index(";base64")].strip().lower()
                    if mime and mime not in ALLOWED_IMAGE_MIMES:
                        return [], f"Photo #{idx+1} has unsupported MIME type '{mime}'. Allowed: JPEG, PNG, WebP."
            else:
                clean_b64 = raw_b64

            # Pre-check base64 length before decoding huge buffers
            if len(clean_b64) > int(max_bytes * 1.4) + 64:
                return [], f"Photo #{idx+1} exceeds maximum allowed size ({max_bytes} bytes)."

            img_bytes = base64.b64decode(clean_b64)
            if len(img_bytes) > max_bytes:
                return [], f"Photo #{idx+1} exceeds maximum allowed size ({max_bytes} bytes)."

            if not _has_valid_image_magic(img_bytes):
                return [], f"Photo #{idx+1} could not be decoded as a valid JPEG, PNG, or WebP image."

            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img is None:
                return [], f"Photo #{idx+1} could not be decoded as a valid image."

            is_valid, emb_vec, reason = face_recognizer.validate_photo_for_enrollment(img)
            if not is_valid or emb_vec is None:
                return [], f"Photo #{idx+1} rejected: {reason}"

            valid_embeddings.append(emb_vec)
        except Exception as e:
            return [], f"Photo #{idx+1} processing error: {str(e)}"

    return valid_embeddings, None


@router.get("")
def get_people():
    conn = get_db_connection()
    cursor = conn.cursor()

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
            "addedDate": r["added_date"],
            "reEnrollmentNeeded": r["face_status"] == "RE_ENROLLMENT_REQUIRED"
        }
        for r in res_rows
    ]

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
            "snapshotUrl": sign_evidence_url(r["snapshot_path"]) if r["snapshot_path"] else None,
            "dwellSeconds": r["dwell_duration"]
        }
        for r in alert_rows
    ]

    return {
        "residents": residents,
        "unknownPersons": unknowns,
        "activeEngine": "InsightFace / ArcFace",
        "inMemoryCachedCount": len(resident_cache),
        "legacyReEnrollmentCount": resident_cache.legacy_count
    }


@router.post("")
def add_resident(req: ResidentCreate, request: Request = None):
    _enforce_enrollment_rate_limit(request)
    conn = get_db_connection()
    cursor = conn.cursor()
    res_id = f"res-{uuid.uuid4().hex[:6]}"
    resident_code = f"RES-{uuid.uuid4().hex[:4].upper()}"
    today_str = datetime.date.today().isoformat()

    # Collect images
    images_to_process: List[str] = []
    if req.face_images_base64:
        images_to_process.extend(req.face_images_base64)
    elif req.face_image_base64:
        images_to_process.append(req.face_image_base64)

    embedding_json = None
    face_status = "PENDING_ENROLLMENT"

    if images_to_process:
        embeddings, error_msg = _process_enrollment_images(images_to_process)
        if error_msg:
            conn.close()
            raise HTTPException(status_code=400, detail=error_msg)

        if embeddings:
            embedding_payload = {
                "version": "arcface_v1",
                "model": INSIGHTFACE_MODEL_NAME,
                "count": len(embeddings),
                "embeddings": embeddings
            }
            embedding_json = json.dumps(embedding_payload)
            face_status = "VERIFIED"

    cursor.execute("""
    INSERT INTO residents (id, name, resident_id, role, face_status, avatar_url, embedding_json, last_detected, detection_count, added_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, ?);
    """, (res_id, req.name, resident_code, req.role, face_status, req.avatar_url, embedding_json, today_str))

    conn.commit()
    conn.close()

    # Update in-memory resident cache immediately
    resident_cache.invalidate()

    # Dual Sync to Supabase Cloud Database if configured
    try:
        from database import get_supabase_client
        sp_client = get_supabase_client()
        if sp_client:
            sp_client.table("residents").insert({
                "id": res_id,
                "name": req.name,
                "resident_id": resident_code,
                "role": req.role,
                "face_status": face_status,
                "avatar_url": req.avatar_url,
                "embedding_json": embedding_json,
                "detection_count": 0,
                "added_date": today_str
            }).execute()
    except Exception as e:
        print(f"Supabase sync warning: {e}")

    return {
        "id": res_id,
        "name": req.name,
        "residentId": resident_code,
        "role": req.role,
        "faceStatus": face_status,
        "enrolledPhotosCount": len(images_to_process) if face_status == "VERIFIED" else 0,
        "message": f"Resident {req.name} successfully enrolled (Status: {face_status})."
    }


@router.post("/{id}/re-enroll")
def re_enroll_resident(id: str, req: ReEnrollRequest, request: Request = None):
    """
    Re-enrolls a resident with new ArcFace biometric photo embeddings.
    Required for legacy prototype residents or updating biometric photos.
    """
    _enforce_enrollment_rate_limit(request)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM residents WHERE id = ?;", (id,))
    resident = cursor.fetchone()
    if not resident:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Resident '{id}' not found.")

    images_to_process: List[str] = []
    if req.face_images_base64:
        images_to_process.extend(req.face_images_base64)
    elif req.face_image_base64:
        images_to_process.append(req.face_image_base64)

    if not images_to_process:
        conn.close()
        raise HTTPException(status_code=400, detail="At least one face photo is required for re-enrollment.")

    embeddings, error_msg = _process_enrollment_images(images_to_process)
    if error_msg:
        conn.close()
        raise HTTPException(status_code=400, detail=error_msg)

    embedding_payload = {
        "version": "arcface_v1",
        "model": INSIGHTFACE_MODEL_NAME,
        "count": len(embeddings),
        "embeddings": embeddings
    }
    embedding_json = json.dumps(embedding_payload)
    face_status = "VERIFIED"

    cursor.execute("""
    UPDATE residents 
    SET face_status = ?, embedding_json = ? 
    WHERE id = ?;
    """, (face_status, embedding_json, id))

    conn.commit()
    conn.close()

    # Invalidate in-memory cache
    resident_cache.invalidate()

    return {
        "id": id,
        "name": resident["name"],
        "faceStatus": face_status,
        "enrolledPhotosCount": len(embeddings),
        "message": f"Resident {resident['name']} successfully re-enrolled with {len(embeddings)} ArcFace embedding(s)."
    }


@router.delete("/{id}")
def delete_resident(id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM residents WHERE id = ?;", (id,))
    conn.commit()
    conn.close()

    # Invalidate cache
    resident_cache.invalidate()

    # Dual Sync to Supabase Cloud Database
    try:
        from database import get_supabase_client
        sp_client = get_supabase_client()
        if sp_client:
            sp_client.table("residents").delete().eq("id", id).execute()
    except Exception as e:
        print(f"Supabase delete sync warning: {e}")

    return {"success": True, "message": f"Resident {id} removed."}
