import cv2
import psutil
import time
from fastapi import APIRouter
from database import get_db_connection
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
from ai.detector import yolo_detector
from tracking.tracker import tracker_manager
from face.recognizer import face_recognizer
from face.cache import resident_cache

router = APIRouter(tags=["health"])

@router.get("/api/health")
def health_check():
    yolo_ready = (yolo_detector is not None) and (getattr(yolo_detector, "model", None) is not None)
    tracker_ready = tracker_manager is not None
    opencv_ready = hasattr(cv2, "__version__")
    face_ready = (face_recognizer is not None) and face_recognizer.is_ready
    device_test_ready = yolo_ready and tracker_ready and opencv_ready and face_ready

    # Query actual camera status from DB
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM cameras WHERE enabled = 1 LIMIT 1;")
        cam_row = cursor.fetchone()
        conn.close()
        if cam_row:
            cam_status = cam_row["status"]
            camera_health = "CONNECTED" if cam_status == "ONLINE" else ("OFFLINE" if cam_status == "OFFLINE" else "NOT_CONFIGURED")
        else:
            camera_health = "NOT_CONFIGURED"
    except Exception:
        camera_health = "UNKNOWN"

    return {
        "status": "ONLINE",
        "backend": "ONLINE",
        "camera": camera_health,
        "yolo": "READY" if yolo_ready else "ERROR",
        "tracker": "READY" if tracker_ready else "ERROR",
        "opencv": "READY" if opencv_ready else "ERROR",
        "face_matcher": "READY" if face_ready else "ERROR",
        "face_recognition": {
            "engine": "InsightFace / ArcFace",
            "provider": getattr(face_recognizer, "active_provider", "UNKNOWN"),
            "model": getattr(face_recognizer, "model_name", "buffalo_s"),
            "status": "READY" if face_ready else "ERROR",
            "cached_residents_count": len(resident_cache),
            "legacy_re_enrollment_needed": resident_cache.legacy_count
        },
        "detector": {
            "model": "YOLOv8-Nano (yolov8n.pt)",
            "status": "READY" if yolo_ready else "ERROR"
        },
        "device_camera_test": "READY" if device_test_ready else "NOT_READY",
        "version": "1.0.0-edge",
        "device": "Smart Vision Sentry Edge AI Box (Jetson/x86/Apple Silicon)",
        "mode": "REAL_MODE",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

@router.get("/api/system/metrics")
def get_system_metrics():
    cpu = psutil.cpu_percent(interval=None) or 0.0
    mem = psutil.virtual_memory()

    gpu_usage = 0.0
    temp_celsius = None
    if hasattr(psutil, "sensors_temperatures"):
        try:
            temps = psutil.sensors_temperatures()
            if temps:
                for sensor_name, entries in temps.items():
                    if entries:
                        temp_celsius = entries[0].current
                        break
        except Exception:
            pass

    # Query camera status
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status, fps FROM cameras WHERE enabled = 1 LIMIT 1;")
    camera_row = cursor.fetchone()
    conn.close()

    if camera_row:
        cam_status = camera_row["status"]
        rtsp_status = "CONNECTED" if cam_status == "ONLINE" else ("DISCONNECTED" if cam_status == "OFFLINE" else "NOT_CONFIGURED")
        fps = float(camera_row["fps"]) if cam_status == "ONLINE" else 0.0
        edge_connection_state = "LIVE" if cam_status == "ONLINE" else "CONNECTED_CAMERA_OFFLINE"
    else:
        rtsp_status = "NOT_CONFIGURED"
        fps = 0.0
        edge_connection_state = "CONNECTED_NO_CAMERA"

    inference_latency = 0.0
    network_latency = 0.0

    telegram_status = "CONNECTED" if (TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID) else "DISCONNECTED"

    open_cv_status = "ACTIVE" if hasattr(cv2, "__version__") else "OFFLINE"
    yolo_status = "ACTIVE" if (yolo_detector and getattr(yolo_detector, "model", None) is not None) else "OFFLINE"
    tracker_status = "ACTIVE" if tracker_manager is not None else "OFFLINE"
    face_status = "ACTIVE" if (face_recognizer and face_recognizer.is_ready) else "OFFLINE"

    return {
        "edgeStatus": "ONLINE",
        "edgeConnectionState": edge_connection_state,
        "cpuUsage": round(cpu, 1),
        "gpuUsage": gpu_usage,
        "ramUsageGb": round(mem.used / (1024**3), 1),
        "ramTotalGb": round(mem.total / (1024**3), 1),
        "tempCelsius": temp_celsius,
        "fps": fps,
        "inferenceLatencyMs": inference_latency,
        "networkLatencyMs": network_latency,
        "queueSize": 0,
        "uptimeSeconds": int(time.time() - psutil.boot_time()),
        "yoloStatus": yolo_status,
        "trackerStatus": tracker_status,
        "faceMatcherStatus": face_status,
        "faceRecognitionEngine": "InsightFace / ArcFace",
        "faceExecutionProvider": getattr(face_recognizer, "active_provider", "UNKNOWN"),
        "openCvStatus": open_cv_status,
        "rtspStatus": rtsp_status,
        "telegramStatus": telegram_status,
        "cachedResidents": len(resident_cache),
        "legacyReEnrollmentCount": resident_cache.legacy_count
    }
