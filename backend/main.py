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
                await websocket.send_json(payload)

            await asyncio.sleep(0.2) # 5 Hz WebSocket update
    except WebSocketDisconnect:
        ws_manager.disconnect(camera_id, websocket)
    except Exception:
        ws_manager.disconnect(camera_id, websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
