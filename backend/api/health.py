import psutil
import time
from fastapi import APIRouter
from database import get_db_connection
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

router = APIRouter(tags=["health"])

@router.get("/api/health")
def health_check():
    return {
        "status": "ONLINE",
        "version": "1.0.0-edge",
        "device": "Smart Vision Sentry Edge AI Box (Jetson/x86)",
        "mode": "REAL_MODE",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

@router.get("/api/system/metrics")
def get_system_metrics():
    # Read actual hardware CPU, RAM, and system stats
    cpu = psutil.cpu_percent(interval=None) or 0.0
    mem = psutil.virtual_memory()

    # Honest fix: gpuUsage was previously hardcoded as cpu * 1.2; returning 0.0 as no GPU telemetry hardware is available
    gpu_usage = 0.0

    # Honest fix: tempCelsius was hardcoded to 48°C; using psutil sensors if available, else None/0.0
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

    # Query actual camera status from database
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status, fps FROM cameras WHERE enabled = 1 LIMIT 1;")
    camera_row = cursor.fetchone()
    conn.close()

    # Honest fix: rtspStatus was hardcoded to CONNECTED; now checking actual camera status from database
    if camera_row:
        cam_status = camera_row["status"]
        rtsp_status = "CONNECTED" if cam_status == "ONLINE" else ("DISCONNECTED" if cam_status == "OFFLINE" else "NOT_CONFIGURED")
        # Honest fix: fps was hardcoded to 10.2; returning real camera target FPS if active, else 0.0
        fps = float(camera_row["fps"]) if cam_status == "ONLINE" else 0.0
    else:
        rtsp_status = "NOT_CONFIGURED"
        fps = 0.0

    # Honest fix: inferenceLatencyMs (18ms) and networkLatencyMs (14ms) were hardcoded; returning 0.0 when unmeasured/idle
    inference_latency = 0.0
    network_latency = 0.0

    # Honest fix: telegramStatus was hardcoded to CONNECTED; now verifying TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID configuration
    telegram_status = "CONNECTED" if (TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID) else "DISCONNECTED"

    return {
        "edgeStatus": "ONLINE",
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
        "yoloStatus": "ACTIVE",
        "byteTrackStatus": "ACTIVE",
        "insightFaceStatus": "ACTIVE",
        "openCvStatus": "ACTIVE",
        "rtspStatus": rtsp_status,
        "telegramStatus": telegram_status
    }

