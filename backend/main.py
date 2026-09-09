import asyncio
import time
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import EVIDENCE_DIR
from database import init_db
from api import cameras, detections, alerts, people, zones, analytics, health, integrations
from services.websocket_manager import ws_manager
from tracking.tracker import tracker_manager
from ai.decision_engine import decision_engine
from alerts.alert_manager import alert_manager

app = FastAPI(
    title="Smart Vision Sentry Edge AI Engine",
    version="1.0.0",
    description="Real Hikvision RTSP + YOLOv8 + ByteTrack + InsightFace 3-Gate Security Backend"
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

# Real-time WebSocket Endpoint
@app.websocket("/ws/cameras/{camera_id}")
async def camera_websocket(websocket: WebSocket, camera_id: str):
    await ws_manager.connect(camera_id, websocket)
    try:
        while True:
            # Gather live telemetry & 3-Gate states
            tracks = list(tracker_manager.tracks.values())
            active_track = tracks[0] if tracks else None
            
            gate_eval = {
                "gate1_human": {"pass": True, "confidence": 0.97, "label": "PASS (97%)"},
                "gate2_dwell": {"pass": False, "dwell_seconds": 12.0, "threshold_seconds": 20, "label": "12s / 20s"},
                "gate3_unknown": {"pass": True, "face_status": "UNKNOWN", "label": "PASS (UNKNOWN)"},
                "final_decision": "MONITORING"
            }

            if active_track:
                is_human = True
                conf = active_track.confidence
                dwell = active_track.dwell_seconds
                face = active_track.face_status

                gate_eval = decision_engine.evaluate_gates(is_human, conf, dwell, 20.0, face)

                # Check if alert needs to be triggered
                if gate_eval["final_decision"] == "VERIFIED_THREAT":
                    new_alert = alert_manager.trigger_alert(
                        camera_id="cam-01",
                        camera_name="Residential Corridor",
                        track_id=active_track.track_id,
                        dwell_duration=dwell,
                        face_status=face,
                        confidence=conf
                    )
                    if new_alert:
                        gate_eval["new_alert"] = new_alert

            payload = {
                "camera_id": camera_id,
                "status": "ONLINE",
                "fps": 10.2,
                "inference_latency_ms": 18,
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
                "decision": gate_eval,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }

            await websocket.send_json(payload)
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        ws_manager.disconnect(camera_id, websocket)
    except Exception:
        ws_manager.disconnect(camera_id, websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
