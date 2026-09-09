# Supabase Integration & Database Setup Guide
## Smart Vision Sentry — Cloud Database Guide

This guide explains how to connect **Smart Vision Sentry** to **Supabase** (PostgreSQL) as an optional cloud database setting.

---

## 1. Environment Configuration

Add the following environment variables to your system environment or `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
SUPABASE_KEY="YOUR_SUPABASE_ANON_OR_SERVICE_ROLE_KEY"
```

---

## 2. Supabase SQL Migration Script

Copy and paste the following SQL script directly into your **Supabase SQL Editor** (`https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new`):

```sql
-- 1. Cameras Table
CREATE TABLE IF NOT EXISTS public.cameras (
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Residents Table
CREATE TABLE IF NOT EXISTS public.residents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    resident_id TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'Family Member',
    face_status TEXT DEFAULT 'PENDING_ENROLLMENT',
    avatar_url TEXT,
    embedding_json TEXT,
    last_detected TEXT,
    detection_count INTEGER DEFAULT 0,
    added_date TEXT
);

-- 3. Detection Zones Table
CREATE TABLE IF NOT EXISTS public.detection_zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    camera_id TEXT NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'CORRIDOR',
    dwell_threshold INTEGER DEFAULT 20,
    enabled INTEGER DEFAULT 1,
    color TEXT DEFAULT '#00f0ff',
    polygon_json TEXT NOT NULL
);

-- 4. Security Alerts Table
CREATE TABLE IF NOT EXISTS public.alerts (
    id TEXT PRIMARY KEY,
    camera_id TEXT NOT NULL,
    camera_name TEXT NOT NULL,
    track_id TEXT NOT NULL,
    detection_type TEXT NOT NULL,
    dwell_duration DOUBLE PRECISION NOT NULL,
    face_status TEXT NOT NULL,
    resident_name TEXT,
    confidence DOUBLE PRECISION NOT NULL,
    severity TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    snapshot_path TEXT,
    telegram_delivered INTEGER DEFAULT 0,
    telegram_latency DOUBLE PRECISION DEFAULT 0.0,
    false_positive_reason TEXT,
    false_positive_timestamp TEXT,
    zone_name TEXT,
    timestamp TEXT NOT NULL
);

-- 5. Events Audit Log Table
CREATE TABLE IF NOT EXISTS public.events (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    camera_id TEXT NOT NULL,
    camera_name TEXT NOT NULL,
    track_id TEXT NOT NULL,
    person_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL
);

-- Seed Default Camera if empty
INSERT INTO public.cameras (id, name, host, port, username, password, channel, stream_type, resolution, fps, enabled, status)
VALUES ('cam-01', 'Residential Corridor Hikvision', '192.168.1.104', 554, 'admin', 'admin123', '101', 'RTSP', '1920x1080', 10, 1, 'OFFLINE')
ON CONFLICT (id) DO NOTHING;
```

---

## 3. Python SDK Setup (Optional)

To enable automatic sync from the backend to Supabase:

1. Install the Supabase Python SDK:
   ```bash
   .venv/bin/pip install supabase
   ```

2. When `SUPABASE_URL` and `SUPABASE_KEY` are provided in `config.py`, the system can perform real-time row replication to Supabase via:
   ```python
   from supabase import create_client
   from config import SUPABASE_URL, SUPABASE_KEY

   supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
   ```
