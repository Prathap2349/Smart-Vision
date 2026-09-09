import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from database import get_db_connection

router = APIRouter(prefix="/api/zones", tags=["zones"])

class PolygonPoint(BaseModel):
    x: float
    y: float

class ZoneCreate(BaseModel):
    name: str
    camera_id: str = "cam-01"
    type: str = "CORRIDOR"
    dwell_threshold: int = 20
    enabled: bool = True
    color: str = "#00f0ff"
    polygon_points: List[PolygonPoint]

@router.get("")
def get_zones():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, name, camera_id, type, dwell_threshold, enabled, color, polygon_json
    FROM detection_zones;
    """)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "name": r["name"],
            "cameraName": r["camera_id"],
            "type": r["type"],
            "dwellThreshold": r["dwell_threshold"],
            "enabled": bool(r["enabled"]),
            "color": r["color"],
            "polygonPoints": json.loads(r["polygon_json"])
        })
    return result

@router.post("")
def add_zone(req: ZoneCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    zone_id = f"zone-0{int(json.dumps(req.name).__hash__() % 1000)}"
    poly_json = json.dumps([p.dict() for p in req.polygon_points])

    cursor.execute("""
    INSERT INTO detection_zones (id, name, camera_id, type, dwell_threshold, enabled, color, polygon_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (zone_id, req.name, req.camera_id, req.type, req.dwell_threshold, int(req.enabled), req.color, poly_json))

    conn.commit()
    conn.close()

    return {
        "id": zone_id,
        "name": req.name,
        "dwellThreshold": req.dwell_threshold,
        "message": f"Detection zone '{req.name}' created."
    }

@router.put("/{id}")
def update_zone(id: str, req: ZoneCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    poly_json = json.dumps([p.dict() for p in req.polygon_points])

    cursor.execute("""
    UPDATE detection_zones SET name = ?, type = ?, dwell_threshold = ?, enabled = ?, color = ?, polygon_json = ?
    WHERE id = ?;
    """, (req.name, req.type, req.dwell_threshold, int(req.enabled), req.color, poly_json, id))

    conn.commit()
    conn.close()

    return {"success": True, "message": f"Zone {id} updated."}

@router.delete("/{id}")
def delete_zone(id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM detection_zones WHERE id = ?;", (id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": f"Zone {id} removed."}
