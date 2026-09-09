from fastapi import APIRouter
from database import get_db_connection

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

@router.get("/hikconnect")
def get_hikconnect_status():
    # Honest fix: Previously hardcoded hikvision_local_rtsp status to "CONNECTED"; now querying database for actual RTSP camera status
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status, port, channel FROM cameras WHERE enabled = 1 LIMIT 1;")
    cam_row = cursor.fetchone()
    conn.close()

    if cam_row:
        cam_status = cam_row["status"]
        status_str = "CONNECTED" if cam_status == "ONLINE" else ("DISCONNECTED" if cam_status == "OFFLINE" else "UNKNOWN")
        rtsp_port = cam_row["port"] or 554
        channel = cam_row["channel"] or "101"
    else:
        status_str = "NOT_CONFIGURED"
        rtsp_port = 554
        channel = "101"

    return {
        "hikvision_local_rtsp": {
            "status": status_str,
            "mode": "Real-time Local AI Edge Processing",
            "rtsp_port": rtsp_port,
            "channel": channel
        },
        "hik_connect": {
            "status": "NOT_CONFIGURED",
            "message": "Hik-Connect OpenAPI cloud gateway layer available as optional integration."
        },
        "hik_central": {
            "status": "NOT_CONFIGURED",
            "message": "HikCentral Professional enterprise VMS integration available."
        }
    }

