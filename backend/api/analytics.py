import time
from fastapi import APIRouter
from database import get_db_connection

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

def _today_prefix():
    return time.strftime("%Y-%m-%d")


@router.get("")
def get_analytics():
    conn = get_db_connection()
    cursor = conn.cursor()
    today = _today_prefix()

    cursor.execute(
        "SELECT COUNT(*) FROM alerts WHERE status = 'FALSE_POSITIVE' AND timestamp LIKE ?;",
        (f"{today}%",),
    )
    false_alarms_today = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM alerts WHERE status = 'ACTIVE' AND timestamp LIKE ?;",
        (f"{today}%",),
    )
    verified_threats_today = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM events WHERE event_type LIKE '%Human%' AND timestamp LIKE ?;",
        (f"{today}%",),
    )
    humans_detected_today = cursor.fetchone()[0]

    cursor.execute(
        "SELECT COUNT(*) FROM events WHERE event_type LIKE '%Resident%' AND timestamp LIKE ?;",
        (f"{today}%",),
    )
    residents_recognized_today = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM events WHERE person_type = 'Unknown Person';")
    unknowns_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM residents WHERE face_status = 'VERIFIED';")
    verified_residents = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM cameras;")
    camera_count = cursor.fetchone()[0]

    cursor.execute(
        "SELECT AVG(telegram_latency) FROM alerts WHERE telegram_delivered = 1 AND telegram_latency > 0;"
    )
    avg_latency_row = cursor.fetchone()[0]
    average_latency_sec = round(float(avg_latency_row), 2) if avg_latency_row else 0.0

    cursor.execute("SELECT COUNT(*) FROM alerts WHERE timestamp LIKE ?;", (f"{today}%",))
    total_alerts_today = cursor.fetchone()[0]

    # Hourly event breakdown (last 24h buckets from events table)
    hourly_events = []
    for hour in ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']:
        hour_num = int(hour.split(':')[0])
        cursor.execute(
            """
            SELECT COUNT(*) FROM events
            WHERE event_type LIKE '%Human%' AND CAST(substr(timestamp, 12, 2) AS INTEGER) >= ?
              AND CAST(substr(timestamp, 12, 2) AS INTEGER) < ?;
            """,
            (hour_num, hour_num + 4),
        )
        humans = cursor.fetchone()[0]
        cursor.execute(
            """
            SELECT COUNT(*) FROM events
            WHERE event_type LIKE '%Resident%' AND CAST(substr(timestamp, 12, 2) AS INTEGER) >= ?
              AND CAST(substr(timestamp, 12, 2) AS INTEGER) < ?;
            """,
            (hour_num, hour_num + 4),
        )
        residents = cursor.fetchone()[0]
        cursor.execute(
            """
            SELECT COUNT(*) FROM alerts
            WHERE status = 'ACTIVE' AND CAST(substr(timestamp, 12, 2) AS INTEGER) >= ?
              AND CAST(substr(timestamp, 12, 2) AS INTEGER) < ?;
            """,
            (hour_num, hour_num + 4),
        )
        threats = cursor.fetchone()[0]
        hourly_events.append({
            "hour": hour,
            "humans": humans,
            "residents": residents,
            "threats": threats,
        })

    # Resident vs unknown pie chart data
    cursor.execute("SELECT COUNT(*) FROM events WHERE person_type = 'Known Resident';")
    known_resident_events = cursor.fetchone()[0]
    pie_data = [
        {"name": "Whitelisted Residents", "value": known_resident_events, "color": "#10b981"},
        {"name": "Unknown Persons", "value": unknowns_count, "color": "#ef4444"},
    ]

    # Alert latency histogram from real alerts
    latency_buckets = {"1.0s": 0, "1.2s": 0, "1.4s": 0, "1.6s": 0, "1.8s": 0}
    cursor.execute(
        "SELECT telegram_latency FROM alerts WHERE telegram_delivered = 1 AND telegram_latency > 0;"
    )
    for row in cursor.fetchall():
        lat = float(row[0])
        if lat <= 1.1:
            latency_buckets["1.0s"] += 1
        elif lat <= 1.3:
            latency_buckets["1.2s"] += 1
        elif lat <= 1.5:
            latency_buckets["1.4s"] += 1
        elif lat <= 1.7:
            latency_buckets["1.6s"] += 1
        else:
            latency_buckets["1.8s"] += 1

    latency_hist = [{"second": k, "count": v} for k, v in latency_buckets.items()]

    # Confidence distribution from alerts
    confidence_buckets = {"90-95%": 0, "95-98%": 0, "98-100%": 0}
    cursor.execute("SELECT confidence FROM alerts WHERE confidence > 0;")
    for row in cursor.fetchall():
        conf = float(row[0]) * 100
        if conf < 95:
            confidence_buckets["90-95%"] += 1
        elif conf < 98:
            confidence_buckets["95-98%"] += 1
        else:
            confidence_buckets["98-100%"] += 1

    confidence_dist = [{"range": k, "count": v} for k, v in confidence_buckets.items()]

    # Hourly alerts for analytics page
    hourly_alerts = []
    for hour in ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']:
        hour_num = int(hour.split(':')[0])
        cursor.execute(
            """
            SELECT COUNT(*) FROM alerts
            WHERE CAST(substr(timestamp, 12, 2) AS INTEGER) >= ?
              AND CAST(substr(timestamp, 12, 2) AS INTEGER) < ?;
            """,
            (hour_num, hour_num + 4),
        )
        hourly_alerts.append({"hour": hour, "alerts": cursor.fetchone()[0]})

    conn.close()

    return {
        "falseAlarmsToday": false_alarms_today,
        "verifiedThreatsToday": verified_threats_today,
        "humansDetectedToday": humans_detected_today,
        "residentsRecognizedToday": residents_recognized_today,
        "unknownPersonsTotal": unknowns_count,
        "verifiedResidentsTotal": verified_residents,
        "cameraCount": camera_count,
        "averageLatencySec": average_latency_sec,
        "totalAlertsToday": total_alerts_today,
        "hourlyEvents": hourly_events,
        "pieData": pie_data,
        "latencyHist": latency_hist,
        "confidenceDist": confidence_dist,
        "hourlyAlerts": hourly_alerts,
        "uptimePercent": 100.0,
    }
