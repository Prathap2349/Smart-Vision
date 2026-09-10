import sqlite3
import json
import time
from typing import List, Dict, Any, Optional
from config import DB_PATH, SUPABASE_URL, SUPABASE_KEY

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_supabase_client():
    if not SUPABASE_KEY:
        return None
    try:
        from supabase import create_client, Client
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Supabase client initialization warning: {e}")
        return None

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Cameras table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cameras (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER DEFAULT 554,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        channel TEXT DEFAULT '101',
        stream_type TEXT DEFAULT 'RTSP',
        resolution TEXT DEFAULT '1920x1080',
        fps INTEGER DEFAULT 10,
        enabled INTEGER DEFAULT 1,
        status TEXT DEFAULT 'OFFLINE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Residents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS residents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        resident_id TEXT NOT NULL UNIQUE,
        role TEXT DEFAULT 'Family Member',
        face_status TEXT DEFAULT 'VERIFIED',
        avatar_url TEXT,
        embedding_json TEXT,
        last_detected TEXT,
        detection_count INTEGER DEFAULT 0,
        added_date TEXT
    );
    """)

    # 3. Detection Zones table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS detection_zones (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        camera_id TEXT NOT NULL,
        type TEXT DEFAULT 'CORRIDOR',
        dwell_threshold INTEGER DEFAULT 20,
        enabled INTEGER DEFAULT 1,
        color TEXT DEFAULT '#00f0ff',
        polygon_json TEXT NOT NULL
    );
    """)

    # 4. Security Alerts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        camera_id TEXT NOT NULL,
        camera_name TEXT NOT NULL,
        track_id TEXT NOT NULL,
        detection_type TEXT NOT NULL,
        dwell_duration REAL NOT NULL,
        face_status TEXT NOT NULL,
        resident_name TEXT,
        confidence REAL NOT NULL,
        severity TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE',
        snapshot_path TEXT,
        telegram_delivered INTEGER DEFAULT 1,
        telegram_latency REAL DEFAULT 1.3,
        false_positive_reason TEXT,
        false_positive_timestamp TEXT,
        zone_name TEXT,
        timestamp TEXT NOT NULL
    );
    """)

    # 5. Events Audit Log table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        camera_id TEXT NOT NULL,
        camera_name TEXT NOT NULL,
        track_id TEXT NOT NULL,
        person_type TEXT NOT NULL,
        event_type TEXT NOT NULL,
        confidence REAL NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL
    );
    """)

    # Seed Default Hikvision Camera if empty
    cursor.execute("SELECT COUNT(*) FROM cameras;")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO cameras (id, name, host, port, username, password, channel, stream_type, resolution, fps, enabled, status)
        VALUES ('cam-01', 'Residential Corridor Hikvision', '192.168.1.104', 554, 'admin', 'admin123', '101', 'RTSP', '1920x1080', 10, 1, 'OFFLINE');
        """)

    # Seed Default Detection Zones if empty
    cursor.execute("SELECT COUNT(*) FROM detection_zones;")
    if cursor.fetchone()[0] == 0:
        poly_corridor = json.dumps([{"x": 15, "y": 25}, {"x": 85, "y": 25}, {"x": 90, "y": 85}, {"x": 10, "y": 85}])
        poly_entry = json.dumps([{"x": 5, "y": 10}, {"x": 35, "y": 10}, {"x": 35, "y": 40}, {"x": 5, "y": 40}])
        cursor.execute("""
        INSERT INTO detection_zones (id, name, camera_id, type, dwell_threshold, enabled, color, polygon_json)
        VALUES 
        ('zone-01', 'Corridor Protection Zone', 'cam-01', 'CORRIDOR', 20, 1, '#00f0ff', ?),
        ('zone-02', 'Entry Vestibule', 'cam-01', 'ENTRY', 20, 1, '#f59e0b', ?);
        """, (poly_corridor, poly_entry))

    conn.commit()
    conn.close()

init_db()
