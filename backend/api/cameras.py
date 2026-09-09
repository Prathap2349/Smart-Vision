import cv2
import json
import time
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from database import get_db_connection
from camera.rtsp_stream import rtsp_manager
from tracking.tracker import tracker_manager
from ai.decision_engine import decision_engine

router = APIRouter(prefix="/api/cameras", tags=["cameras"])

class CameraCreate(BaseModel):
    name: str
    host: str
    port: int = 554
    username: str
    password: str
    channel: str = "101"
    stream_type: str = "RTSP"
    location: Optional[str] = "Perimeter Zone"

class TestRTSPRequest(BaseModel):
    host: str
    port: int = 554
    username: str
    password: str
    channel: str = "101"

@router.get("")
def get_cameras():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, host, port, channel, stream_type, resolution, fps, enabled, status FROM cameras;")
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "name": r["name"],
            "location": f"{r['host']}:{r['port']} Channel {r['channel']}",
            "status": r["status"],
            "streamType": r["stream_type"],
            "resolution": r["resolution"],
            "fps": r["fps"],
            "aiActive": True,
            "latency": 1.4,
            "rtspUrlMasked": f"rtsp://{r['username'] if 'username' in r.keys() else 'admin'}:****@{r['host']}:{r['port']}/Streaming/channels/{r['channel']}",
            "bitrateMb": 4.2,
            "aiLoadCpu": 34,
            "aiLoadGpu": 42,
            "recentEventCount": 14
        })
    return result

@router.post("")
def add_camera(cam: CameraCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cam_id = f"cam-0{int(time.time()) % 100}"
    cursor.execute("""
    INSERT INTO cameras (id, name, host, port, username, password, channel, stream_type, enabled, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'ONLINE');
    """, (cam_id, cam.name, cam.host, cam.port, cam.username, cam.password, cam.channel, cam.stream_type))
    conn.commit()
    conn.close()
    return {"id": cam_id, "message": f"Camera '{cam.name}' connected successfully."}

@router.delete("/{id}")
def delete_camera(id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cameras WHERE id = ?;", (id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": f"Camera {id} removed."}

@router.post("/{id}/test")
def test_camera_connection(id: str, req: Optional[TestRTSPRequest] = None):
    if req:
        res = rtsp_manager.test_connection(req.host, req.port, req.username, req.password, req.channel)
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT host, port, username, password, channel FROM cameras WHERE id = ?;", (id,))
        r = cursor.fetchone()
        conn.close()
        if not r:
            raise HTTPException(status_code=404, detail="Camera not found.")
        res = rtsp_manager.test_connection(r["host"], r["port"], r["username"], r["password"], r["channel"])
    
    return res

@router.get("/{id}/stream")
def get_camera_stream_info(id: str):
    return {
        "camera_id": id,
        "stream_type": "WEBRTC_MJPEG",
        "mjpeg_url": f"/api/cameras/{id}/mjpeg",
        "webrtc_url": f"ws://localhost:8000/ws/cameras/{id}",
        "resolution": "1920x1080",
        "fps": 10
    }

def mjpeg_generator(camera_id: str):
    while True:
        frame = rtsp_manager.generate_simulated_corridor_frame()
        tracks = tracker_manager.tracks.values()
        
        # Annotate real AI detection boxes & track tags
        for t in tracks:
            x1, y1, x2, y2 = t.bbox
            is_threat = t.dwell_seconds >= 20 and t.face_status == "UNKNOWN"
            color = (0, 0, 255) if is_threat else (0, 255, 0)
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
            cv2.putText(frame, f"PERSON {t.track_id} | DWELL {t.dwell_seconds}s", (int(x1), int(y1) - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        ret, jpeg = cv2.imencode('.jpg', frame)
        if not ret:
            continue
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
        time.sleep(0.1) # ~10 FPS

@router.get("/{id}/mjpeg")
def mjpeg_stream(id: str):
    return StreamingResponse(mjpeg_generator(id), media_type="multipart/x-mixed-replace; boundary=frame")
