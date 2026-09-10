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
from services.onvif_scanner import onvif_scanner

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
    cursor.execute("SELECT id, name, host, port, channel, username, stream_type, resolution, fps, enabled, status FROM cameras;")
    rows = cursor.fetchall()

    result = []
    for r in rows:
        cam_id = r["id"]
        # Query real count of alerts for this camera from database
        cursor.execute("SELECT COUNT(*) FROM alerts WHERE camera_id = ?;", (cam_id,))
        event_count = cursor.fetchone()[0]

        # Query measured FPS & connection state from real capture manager
        frame, is_connected, real_fps = rtsp_manager.get_frame_data(cam_id)
        status_str = "ONLINE" if is_connected else r["status"]

        result.append({
            "id": cam_id,
            "name": r["name"],
            "location": f"{r['host']}:{r['port']} Channel {r['channel']}",
            "status": status_str,
            "streamType": r["stream_type"],
            "resolution": r["resolution"] if is_connected else "1080p (Disconnected)",
            "fps": real_fps if is_connected else 0,
            "aiActive": is_connected,
            "latency": 0.0,
            "rtspUrlMasked": f"rtsp://{r['username']}:****@{r['host']}:{r['port']}/Streaming/channels/{r['channel']}",
            "bitrateMb": 0.0,
            "aiLoadCpu": 0,
            "aiLoadGpu": 0,
            "recentEventCount": event_count
        })
    conn.close()
    return result

@router.post("")
def add_camera(cam: CameraCreate):
    cam_id = f"cam-0{int(time.time()) % 100}"
    
    # 1. Test RTSP Connection before setting status to ONLINE
    conn_res = rtsp_manager.test_connection(cam.host, cam.port, cam.username, cam.password, cam.channel)
    is_online = conn_res.get("connected", False)
    initial_status = "ONLINE" if is_online else "OFFLINE"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO cameras (id, name, host, port, username, password, channel, stream_type, enabled, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
    """, (cam_id, cam.name, cam.host, cam.port, cam.username, cam.password, cam.channel, cam.stream_type, initial_status))
    conn.commit()
    conn.close()

    if is_online:
        # Start continuous background capture thread for this camera
        rtsp_manager.start_camera(cam_id, cam.host, cam.port, cam.username, cam.password, cam.channel)
        return {
            "id": cam_id,
            "name": cam.name,
            "status": "ONLINE",
            "connected": True,
            "message": f"Camera '{cam.name}' connected and saved successfully."
        }
    else:
        return {
            "id": cam_id,
            "name": cam.name,
            "status": "OFFLINE",
            "connected": False,
            "message": f"Camera '{cam.name}' saved, but connection test failed (OFFLINE: {conn_res.get('message', 'No RTSP signal')})."
        }

@router.delete("/{id}")
def delete_camera(id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cameras WHERE id = ?;", (id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": f"Camera {id} removed."}

@router.get("/onvif/scan")
def scan_onvif_network():
    discovered = onvif_scanner.scan_network(timeout=2.0)
    return {
        "count": len(discovered),
        "cameras": discovered,
        "message": f"Discovered {len(discovered)} ONVIF cameras on local network." if discovered else "No ONVIF cameras responded on local subnet."
    }

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
    _, is_connected, real_fps = rtsp_manager.get_frame_data(id)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT resolution FROM cameras WHERE id = ?;", (id,))
    row = cursor.fetchone()
    conn.close()
    resolution = row["resolution"] if row else "1920x1080"
    return {
        "camera_id": id,
        "stream_type": "MJPEG_RTSP",
        "mjpeg_url": f"/api/cameras/{id}/mjpeg",
        "websocket_url": f"/ws/cameras/{id}",
        "resolution": resolution if is_connected else "Disconnected",
        "fps": real_fps if is_connected else 0,
    }

def mjpeg_generator(camera_id: str):
    while True:
        frame, is_connected, fps = rtsp_manager.get_frame_data(camera_id)
        if not is_connected or frame is None:
            frame = rtsp_manager.generate_no_signal_frame(camera_name="Corridor Camera")
        else:
            frame = frame.copy()
            # Draw real active tracks & AI bounding boxes
            tracks = list(tracker_manager.tracks.values())
            for t in tracks:
                x1, y1, x2, y2 = [int(v) for v in t.bbox]
                is_threat = t.dwell_seconds >= 20 and t.face_status == "UNKNOWN"
                color = (0, 0, 255) if is_threat else (0, 255, 0)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f"PERSON {t.track_id} | DWELL {t.dwell_seconds}s", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        ret, jpeg = cv2.imencode('.jpg', frame)
        if not ret:
            time.sleep(0.05)
            continue

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
        time.sleep(0.05) # ~20 FPS stream

@router.get("/{id}/mjpeg")
def mjpeg_stream(id: str):
    return StreamingResponse(mjpeg_generator(id), media_type="multipart/x-mixed-replace; boundary=frame")
