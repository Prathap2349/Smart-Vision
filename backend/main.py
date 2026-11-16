import asyncio
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

import config
from config import EVIDENCE_DIR, ALLOWED_ORIGINS
from database import init_db, get_db_connection
from api import cameras, detections, alerts, people, zones, analytics, health, integrations, evaluation
from services.websocket_manager import ws_manager
from services.security import (
    is_request_authenticated,
    is_websocket_authenticated,
    verify_evidence_signature,
)
from tracking.tracker import tracker_manager
from ai.decision_engine import decision_engine
from alerts.alert_manager import alert_manager
from camera.rtsp_stream import rtsp_manager
from detection_loop import detection_loop, pipeline_registry


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite Database
    init_db()

    # 2. Start every enabled camera pipeline (capture + per-camera tracker + loop)
    started = pipeline_registry.start_all_enabled_cameras()
    print(f"[Main Engine] Started {len(started)} enabled camera pipeline(s): {started}")
    try:
        yield
    finally:
        # 3. Graceful shutdown of camera pipelines, RTSP threads, and alert dispatcher
        pipeline_registry.stop_all()
        alert_manager.stop()
        print("[Main Engine] Graceful shutdown complete.")


app = FastAPI(
    title="Smart Vision Sentry Edge AI Engine",
    version="1.0.0",
    description="InsightFace Biometrics + YOLO Human Detection + Lightweight IoU Tracking + Triple-Gate Decision Engine",
    lifespan=lifespan,
)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    if (
        request.method != "OPTIONS"
        and path.startswith("/api")
        and path != "/api/health"
        and not path.startswith("/api/evidence/")
    ):
        if not is_request_authenticated(request):
            return JSONResponse(status_code=401, content={"detail": "Authentication required"})
    return await call_next(request)


# Enable CORS restricted to configured ALLOWED_ORIGINS (default localhost:5173/3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/evidence/{file_path:path}")
def serve_protected_evidence(file_path: str, request: Request):
    exp = request.query_params.get("exp")
    sig = request.query_params.get("sig")
    if not (is_request_authenticated(request) or verify_evidence_signature(file_path, exp, sig)):
        raise HTTPException(status_code=401, detail="Authentication or valid signed URL required")

    evidence_root = EVIDENCE_DIR.resolve()
    target_path = (evidence_root / file_path).resolve()
    try:
        target_path.relative_to(evidence_root)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid evidence path")

    if not target_path.is_file():
        raise HTTPException(status_code=404, detail="Evidence file not found")

    return FileResponse(str(target_path))

# Register Routers
app.include_router(cameras.router)
app.include_router(detections.router)
app.include_router(alerts.router)
app.include_router(people.router)
app.include_router(zones.router)
app.include_router(analytics.router)
app.include_router(health.router)
app.include_router(integrations.router)
app.include_router(evaluation.router)

# Real-time WebSocket Endpoint
@app.websocket("/ws/cameras/{camera_id}")
async def camera_websocket(websocket: WebSocket, camera_id: str):
    if not is_websocket_authenticated(websocket):
        await websocket.close(code=1008)
        return
    await ws_manager.connect(camera_id, websocket)
    try:
        while True:
            # Relay real detection state & measured telemetry from per-camera pipeline registry
            state = pipeline_registry.get_state(camera_id)
            if not state:
                legacy_state = detection_loop.last_detection_state
                if legacy_state and legacy_state.get("camera_id") == camera_id:
                    state = legacy_state

            if state and state.get("camera_id") == camera_id:
                await websocket.send_json(state)
            else:
                payload = {
                    "camera_id": camera_id,
                    "status": "OFFLINE",
                    "fps": 0,
                    "inference_latency_ms": 0,
                    "tracks": [],
                    "decision": decision_engine.evaluate_gates(is_human=False),
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
                await websocket.send_json(payload)
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

def _process_test_camera_frame(
    img_bytes: bytes,
    test_tracker: LightweightIoUTracker,
    user_zones: list,
    dwell_threshold: float,
) -> Optional[dict]:
    """
    Executes synchronous YOLO + Tracker + InsightFace + Decision Engine inference
    in a worker thread so the FastAPI asyncio event loop is never blocked.
    """
    np_arr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if frame is None:
        return None

    h, w, _ = frame.shape
    proc_start = time.time()

    # 1. Real YOLO Human Detection
    detections = yolo_detector.detect(frame)

    # 2. Real Lightweight IoU Tracker
    tracks = test_tracker.update_tracks(detections, zones=user_zones, frame_w=w, frame_h=h, frame=frame)

    eval_tracks = []
    highest_threat_rank = 0
    primary_track = None

    # 3. InsightFace Resident Matcher & Triple-Gate Decision Engine per track
    for t in tracks:
        x1, y1, x2, y2 = [int(v) for v in t.bbox]
        crop = frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]
        if crop.size > 0 and t.should_verify_face():
            rec = face_recognizer.recognize_face(crop)
            t.record_face_result(
                rec["status"],
                rec["resident_name"],
                rec["confidence"],
                embedding=rec["embedding"]
            )

        t_gate_eval = decision_engine.evaluate_gates(
            is_human=True,
            human_confidence=t.confidence,
            dwell_seconds=t.dwell_seconds,
            dwell_threshold=dwell_threshold,
            face_status=t.face_status
        )

        if (t.current_zone != "Outside ROI" and
            t.dwell_seconds >= dwell_threshold and
            not t.snapshot_captured):
            pad = 20
            cx1, cy1 = max(0, x1 - pad), max(0, y1 - pad)
            cx2, cy2 = min(w, x2 + pad), min(h, y2 + pad)
            snap_crop = frame[cy1:cy2, cx1:cx2]
            if snap_crop.size > 0:
                _, buf = cv2.imencode('.jpg', snap_crop)
                t.snapshot_base64 = f"data:image/jpeg;base64,{base64.b64encode(buf).decode('utf-8')}"
                t.snapshot_captured = True
                t.snapshot_timestamp = time.strftime("%H:%M:%S")

        track_dict = {
            "track_id": t.track_id,
            "bbox": t.bbox,
            "dwell_seconds": round(t.dwell_seconds, 1),
            "current_zone": t.current_zone,
            "face_status": t.face_status,
            "resident_name": t.resident_name,
            "confidence": round(t.confidence, 3),
            "decision": t_gate_eval,
            "snapshot_base64": t.snapshot_base64,
            "snapshot_captured": t.snapshot_captured,
            "snapshot_timestamp": t.snapshot_timestamp
        }
        eval_tracks.append(track_dict)

        dec_str = t_gate_eval.get("final_decision", "IDLE")
        rank = (
            4 if dec_str == "VERIFIED_THREAT"
            else 3 if dec_str == "UNVERIFIED_LOITERER"
            else 2 if dec_str == "SAFE_RESIDENT"
            else 1 if dec_str == "MONITORING"
            else 0
        )
        if rank >= highest_threat_rank:
            highest_threat_rank = rank
            primary_track = t

    if primary_track:
        gate_eval = decision_engine.evaluate_gates(
            is_human=True,
            human_confidence=primary_track.confidence,
            dwell_seconds=primary_track.dwell_seconds,
            dwell_threshold=dwell_threshold,
            face_status=primary_track.face_status
        )
    else:
        gate_eval = decision_engine.evaluate_gates(
            is_human=False,
            human_confidence=0.0,
            dwell_seconds=0.0,
            dwell_threshold=dwell_threshold,
            face_status="NONE"
        )

    proc_duration = time.time() - proc_start
    proc_fps = round(1.0 / proc_duration, 1) if proc_duration > 0 else 10.0

    yolo_ready = (yolo_detector is not None) and (getattr(yolo_detector, "model", None) is not None)
    return {
        "mode": "DEVICE_CAMERA_TEST",
        "camera_status": "CONNECTED",
        "ai_status": "PROCESSING",
        "yolo_status": "READY" if yolo_ready else "ERROR",
        "tracker_status": "READY",
        "tracks": eval_tracks,
        "people_count": len(eval_tracks),
        "fps": proc_fps,
        "inference_latency_ms": round(proc_duration * 1000, 1),
        "decision": gate_eval,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }


# Dedicated Real Device Camera Test WebSocket Endpoint
@app.websocket("/ws/test-camera")
async def test_camera_websocket(websocket: WebSocket):
    if not is_websocket_authenticated(websocket):
        await websocket.close(code=1008)
        return
    await websocket.accept()
    test_tracker = LightweightIoUTracker()
    loop = asyncio.get_running_loop()

    latest_frame_data = None
    dropped_frames = 0
    closed = False
    new_frame_event = asyncio.Event()

    async def receiver():
        nonlocal latest_frame_data, dropped_frames, closed
        try:
            while True:
                message = await websocket.receive()
                if message.get("type") == "websocket.disconnect":
                    break

                max_frame_bytes = int(getattr(config, "MAX_WS_FRAME_BYTES", 2 * 1024 * 1024))
                img_bytes = None
                dwell_threshold = 10.0
                user_zones = []

                if "bytes" in message and message["bytes"]:
                    raw_bytes = message["bytes"]
                    if len(raw_bytes) > max_frame_bytes:
                        await websocket.send_json({
                            "error": f"Frame exceeds maximum allowed size ({max_frame_bytes} bytes)",
                            "code": "FRAME_TOO_LARGE",
                        })
                        continue
                    img_bytes = raw_bytes
                elif "text" in message and message["text"]:
                    raw_text = message["text"]
                    if len(raw_text) > int(max_frame_bytes * 1.5) + 4096:
                        await websocket.send_json({
                            "error": f"Frame exceeds maximum allowed size ({max_frame_bytes} bytes)",
                            "code": "FRAME_TOO_LARGE",
                        })
                        continue
                    try:
                        payload = json.loads(raw_text)
                        img_str = payload.get("image", "")
                        if img_str:
                            if img_str.startswith("data:image"):
                                img_str = img_str.split(",")[1]
                            decoded = base64.b64decode(img_str)
                            if len(decoded) > max_frame_bytes:
                                await websocket.send_json({
                                    "error": f"Frame exceeds maximum allowed size ({max_frame_bytes} bytes)",
                                    "code": "FRAME_TOO_LARGE",
                                })
                                continue
                            img_bytes = decoded
                        if "dwell_threshold" in payload:
                            dwell_threshold = float(payload["dwell_threshold"])
                        if "zones" in payload and isinstance(payload["zones"], list):
                            user_zones = payload["zones"]
                    except Exception:
                        pass

                if not img_bytes:
                    continue

                # Drop any stale unprocessed frame rather than queueing
                if latest_frame_data is not None:
                    dropped_frames += 1
                latest_frame_data = (img_bytes, user_zones, dwell_threshold)
                new_frame_event.set()
        except WebSocketDisconnect:
            pass
        except Exception as e:
            print(f"[WS Device Camera Test Receiver Error]: {e}")
        finally:
            closed = True
            new_frame_event.set()

    recv_task = asyncio.create_task(receiver())
    try:
        while True:
            await new_frame_event.wait()
            new_frame_event.clear()

            while latest_frame_data is not None:
                img_bytes, user_zones, dwell_threshold = latest_frame_data
                latest_frame_data = None

                res_payload = await loop.run_in_executor(
                    None,
                    _process_test_camera_frame,
                    img_bytes,
                    test_tracker,
                    user_zones,
                    dwell_threshold,
                )
                if res_payload is not None:
                    res_payload["dropped_frames"] = dropped_frames
                    await websocket.send_json(res_payload)

            if closed:
                break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS Device Camera Test Error]: {e}")
    finally:
        recv_task.cancel()
        try:
            await recv_task
        except asyncio.CancelledError:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
