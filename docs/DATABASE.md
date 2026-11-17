# SQLite database

The database path is `${DATA_DIR}/smart_vision.db`; locally `DATA_DIR` defaults to `backend/data`, while the Docker image defaults to `/data`. `backend/database.py:init_db()` creates these tables and seeds a default camera and two zones when their tables are empty. Camera passwords are encrypted before storage; legacy plaintext values are migrated during initialization.

## `cameras`

| Column | SQLite type | Null/default | Meaning |
| --- | --- | --- | --- |
| `id` | TEXT | primary key | Camera identifier. |
| `name` | TEXT | NOT NULL | Display name. |
| `host` | TEXT | NOT NULL | Host or address. |
| `port` | INTEGER | 554 | RTSP port. |
| `username` | TEXT | NOT NULL | Camera username. |
| `password` | TEXT | NOT NULL | Fernet ciphertext prefixed `enc:v1:`. |
| `channel` | TEXT | 101 | RTSP channel. |
| `stream_type` | TEXT | RTSP | Stream protocol/type. |
| `resolution` | TEXT | 1920x1080 | Configured resolution. |
| `fps` | INTEGER | 10 | Configured frame rate. |
| `enabled` | INTEGER | 1 | Whether the camera is enabled. |
| `status` | TEXT | OFFLINE | Stored connection status. |
| `user_id` | TEXT | default_user | Owning user scope. |
| `created_at` | TIMESTAMP | CURRENT_TIMESTAMP | Row creation time. |

## `residents`

| Column | SQLite type | Null/default | Meaning |
| --- | --- | --- | --- |
| `id` | TEXT | primary key | Resident identifier. |
| `name` | TEXT | NOT NULL | Display name. |
| `resident_id` | TEXT | NOT NULL, UNIQUE | Human-facing resident code. |
| `role` | TEXT | Family Member | Relationship/role. |
| `face_status` | TEXT | VERIFIED | Enrollment or verification state. |
| `avatar_url` | TEXT | nullable | Optional avatar reference. |
| `embedding_json` | TEXT | nullable | ArcFace schema/version and embedding vectors. |
| `last_detected` | TEXT | nullable | Last recognized timestamp. |
| `detection_count` | INTEGER | 0 | Recognition count. |
| `added_date` | TEXT | nullable | Enrollment date. |

## `detection_zones`

| Column | SQLite type | Null/default | Meaning |
| --- | --- | --- | --- |
| `id` | TEXT | primary key | UUID-based zone ID. |
| `name` | TEXT | NOT NULL | Zone label. |
| `camera_id` | TEXT | NOT NULL | Associated camera. |
| `type` | TEXT | CORRIDOR | Zone type. |
| `dwell_threshold` | INTEGER | 20 | Optional per-zone dwell threshold in seconds. |
| `enabled` | INTEGER | 1 | Whether zone matching is active. |
| `color` | TEXT | #00f0ff | Frontend display color. |
| `polygon_json` | TEXT | NOT NULL | Polygon points serialized as JSON. |

## `alerts`

| Column | SQLite type | Null/default | Meaning |
| --- | --- | --- | --- |
| `id` | TEXT | primary key | Alert ID. |
| `camera_id` | TEXT | NOT NULL | Source camera ID. |
| `camera_name` | TEXT | NOT NULL | Camera display name at alert time. |
| `track_id` | TEXT | NOT NULL | Person track ID. |
| `detection_type` | TEXT | NOT NULL | Threat type, including unverified loiterer. |
| `dwell_duration` | REAL | NOT NULL | Time in zone at alert. |
| `face_status` | TEXT | NOT NULL | Face recognition/quality state. |
| `resident_name` | TEXT | nullable | Matched resident if applicable. |
| `confidence` | REAL | NOT NULL | Human confidence. |
| `severity` | TEXT | NOT NULL | Alert severity. |
| `status` | TEXT | ACTIVE | Alert workflow status. |
| `snapshot_path` | TEXT | nullable | Relative evidence URL/path. |
| `telegram_delivered` | INTEGER | 1 | Whether Telegram delivery succeeded. |
| `telegram_latency` | REAL | 1.3 | Delivery latency seconds. |
| `false_positive_reason` | TEXT | nullable | Feedback text. |
| `false_positive_timestamp` | TEXT | nullable | Feedback time. |
| `zone_name` | TEXT | nullable | Matched zone. |
| `timestamp` | TEXT | NOT NULL | Alert timestamp. |

## `events`

| Column | SQLite type | Null/default | Meaning |
| --- | --- | --- | --- |
| `id` | TEXT | primary key | Event ID. |
| `timestamp` | TEXT | NOT NULL | Event timestamp. |
| `camera_id` | TEXT | NOT NULL | Source camera ID. |
| `camera_name` | TEXT | NOT NULL | Camera display name. |
| `track_id` | TEXT | NOT NULL | Associated track ID. |
| `person_type` | TEXT | NOT NULL | Known/unknown person classification. |
| `event_type` | TEXT | NOT NULL | Event description. |
| `confidence` | REAL | NOT NULL | Human confidence. |
| `severity` | TEXT | NOT NULL | Event severity. |
| `status` | TEXT | NOT NULL | Event status. |

There are no foreign-key constraints declared in the current schema. `cameras.user_id` is also added with `ALTER TABLE` when upgrading an older camera table that predates that column.
