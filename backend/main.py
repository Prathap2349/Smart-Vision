import asyncio
import time
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import EVIDENCE_DIR
from database import init_db, get_db_connection
from api import cameras, detections, alerts, people, zones, analytics, health, integrations
from services.websocket_manager import ws_manager
from tracking.tracker import tracker_manager
from ai.decision_engine import decision_engine
from camera.rtsp_stream import rtsp_manager
from detection_loop import detection_loop

app = FastAPI(
    title="Smart Vision Sentry Edge AI Engine",
    version="1.0.0",
    description="Real Continuous Camera Capture + YOLO Human Detection + Lightweight IoU Tracking + Prototype Resident Matching"
)

# Enable CORS for React frontend (port 3000 & 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve Evidence Snapshots (.jpg files)
app.mount("/api/evidence", StaticFiles(directory=str(EVIDENCE_DIR)), name="evidence")

# Register Routers
app.include_router(cameras.router)
app.include_router(detections.router)
app.include_router(alerts.router)
app.include_router(people.router)
app.include_router(zones.router)
app.include_router(analytics.router)
app.include_router(health.router)
app.include_router(integrations.router)

@app.on_event("startup")
def startup_event():
    # 1. Initialize SQLite Database
    init_db()

    # 2. Start default camera capture thread if camera exists
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, host, port, username, password, channel FROM cameras WHERE enabled = 1 LIMIT 1;")
    r = cursor.fetchone()
    conn.close()

    if r:
        rtsp_manager.start_camera(r["id"], r["host"], r["port"], r["username"], r["password"], r["channel"])

    # 3. Start continuous AI detection background loop
    detection_loop.start()
    print("[Main Engine] Continuous AI Detection Loop & Real Camera Capture Started Successfully.")

# Real-time WebSocket Endpoint
@app.websocket("/ws/cameras/{camera_id}")
async def camera_websocket(websocket: WebSocket, camera_id: str):
    await ws_manager.connect(camera_id, websocket)
    try:
        while True:
            # Relay real detection state & measured telemetry from continuous loop
            state = detection_loop.last_detection_state
            if state:
                await websocket.send_json(state)
            else:
                _, is_connected, real_fps = rtsp_manager.get_frame_data(camera_id)
                tracks = list(tracker_manager.tracks.values())
                payload = {
                    "camera_id": camera_id,
                    "status": "ONLINE" if is_connected else "OFFLINE",
                    "fps": real_fps,
                    "inference_latency_ms": 0,
                    "tracks": [
                        {
                            "track_id": t.track_id,
                            "bbox": t.bbox,
                            "dwell_seconds": t.dwell_seconds,
                            "face_status": t.face_status,
                            "confidence": t.confidence,
                            "current_zone": t.current_zone
                        }
                        for t in tracks
                    ],
                    "decision": {
                        "gate1_human": {"pass": len(tracks) > 0, "label": "HUMAN CHECK"},
                        "gate2_dwell": {"pass": any(t.dwell_seconds >= 20 for t in tracks), "label": "LOITERING CHECK"},
                        "gate3_unknown": {"pass": any(t.face_status == "UNKNOWN" for t in tracks), "label": "FAMILY CHECK"},
                        "final_decision": "VERIFIED_THREAT" if any(t.dwell_seconds >= 20 and t.face_status == "UNKNOWN" for t in tracks) else "CLEAR"
                    },
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
            await asyncio.sleep(0.2) # 5 Hz WebSocket update
    except WebSocketDisconnect:
        ws_manager.disconnect(camera_id, websocket)
    except Exception:
        ws_manager.disconnect(camera_id, websocket)

import base64
import json
import cv2
import numpy as np
from ai.detector import yolo_detector
from tracking.tracker import LightweightIoUTracker
from face.recognizer import face_recognizer

# Dedicated Real Device Camera Test WebSocket Endpoint
@app.websocket("/ws/test-camera")
async def test_camera_websocket(websocket: WebSocket):
    await websocket.accept()
    test_tracker = LightweightIoUTracker()

    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break

            img_bytes = None
            if "bytes" in message and message["bytes"]:
                img_bytes = message["bytes"]
            elif "text" in message and message["text"]:
                try:
                    payload = json.loads(message["text"])
                    img_str = payload.get("image", "")
                    if img_str.startswith("data:image"):
                        img_str = img_str.split(",")[1]
                    img_bytes = base64.b64decode(img_str)
                except Exception:
                    pass

            if not img_bytes:
                continue

            # Decode JPEG image
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            h, w, _ = frame.shape
            proc_start = time.time()

            # 1. Real YOLO Human Detection
            detections = yolo_detector.detect(frame)

            # 2. Real Lightweight IoU Tracker
            tracks = test_tracker.update_tracks(detections, zones=[], frame_w=w, frame_h=h)

            # 3. Real Prototype Resident Matcher
            for t in tracks:
                x1, y1, x2, y2 = [int(v) for v in t.bbox]
                crop = frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]
                if crop.size > 0:
                    face_status, res_name, face_conf = face_recognizer.match_face(crop)
                    t.face_status = face_status
                    t.resident_name = res_name

            # 4. Real Triple-Gate Decision Engine
            if tracks:
                active_track = tracks[0]
                gate_eval = decision_engine.evaluate_gates(
                    is_human=True,
                    human_confidence=active_track.confidence,
                    dwell_seconds=active_track.dwell_seconds,
                    dwell_threshold=20.0,
                    face_status=active_track.face_status
                )
            else:
                gate_eval = decision_engine.evaluate_gates(
                    is_human=False,
                    human_confidence=0.0,
                    dwell_seconds=0.0,
                    dwell_threshold=20.0,
                    face_status="NONE"
                )

            proc_duration = time.time() - proc_start
            proc_fps = round(1.0 / proc_duration, 1) if proc_duration > 0 else 10.0

            res_payload = {
                "mode": "DEVICE_CAMERA_TEST",
                "camera_status": "CONNECTED",
                "fps": proc_fps,
                "inference_latency_ms": round(proc_duration * 1000, 1),
                "tracks": [
                    {
                        "track_id": t.track_id,
                        "bbox": t.bbox,
                        "dwell_seconds": round(t.dwell_seconds, 1),
                        "face_status": t.face_status,
                        "resident_name": t.resident_name,
                        "confidence": round(t.confidence, 3)
                    } for t in tracks
                ],
                "decision": gate_eval,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }

            await websocket.send_json(res_payload)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS Device Camera Test Error]: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
