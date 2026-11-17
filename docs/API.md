# HTTP and WebSocket API

The route list below reflects the FastAPI routers in `backend/api/` and the direct routes in `backend/main.py`.

## Authentication and errors

Every `/api/*` route requires a valid Supabase JWT (`Authorization: Bearer <token>`) or an `X-API-Key` matching backend `API_KEY`, except `GET /api/health`. `GET /api/evidence/{file_path}` also accepts a valid signed URL instead of a bearer/API key. All WebSocket routes require authentication. `DEV_MODE=true` bypasses these checks for local development only; production startup requires `DEV_MODE=false` and secrets.

HTTP errors use this JSON shape and include the same ID in the `X-Request-ID` response header:

```json
{"error":"Authentication required","code":"AUTHENTICATION_REQUIRED","request_id":"<uuid>"}
```

Unauthenticated protected requests return **401**. Request validation errors return **422** with `code: "VALIDATION_ERROR"`. Enrollment/re-enrollment rate limiting returns **429** with the same error shape; the configured limit is per client IP and per rolling 60-second window (`ENROLLMENT_RATE_LIMIT_PER_MIN`, default 10). Other HTTP exceptions use `HTTP_<status>` codes.

Evidence links use `?exp=<unix-seconds>&sig=<hex-hmac>`. The HMAC-SHA256 covers the normalized evidence-relative path and expiry, with a key derived from `CAMERA_SECRET`. The default lifetime is one hour. The URL is rejected after expiry, if its path changes, or if its signature is invalid. Keep `CAMERA_SECRET` stable across instances and restarts.

## REST routes

All routes below require auth unless explicitly marked public. Path parameters are shown in braces.

| Method and path | Inputs | Response |
| --- | --- | --- |
| `GET /api/health` | None; **public** | Backend/camera/model readiness, per-camera pipeline state, last stream error, and timestamp. |
| `GET /api/system/metrics` | None | CPU, RAM, temperature when available, stream state, FPS, uptime (`null` if the OS denies boot-time access), and model/integration status. |
| `GET /api/cameras` | Optional query `user_id` | Camera list; RTSP credentials are masked and passwords are never returned. |
| `POST /api/cameras` | JSON `name`, `host`, `username`, `password`; optional `port` (554), `channel` (101), `stream_type` (RTSP), `location`, `user_id` | Saved camera with `id`, `status`, `connected`, and message. The supplied password is encrypted at rest. |
| `DELETE /api/cameras/{id}` | Camera ID | `{ "success": true, "message": ... }` |
| `GET /api/cameras/onvif/scan` | None | `{ "count": number, "cameras": [...], "message": ... }` |
| `POST /api/cameras/{id}/test` | Optional JSON `host`, `port`, `username`, `password`, `channel`; absent body tests the saved camera | RTSP connection result. Unknown saved ID returns 404. |
| `GET /api/cameras/{id}/stream` | Camera ID | Stream type, MJPEG and WebSocket paths, resolution, and FPS. |
| `GET /api/cameras/{id}/mjpeg` | Camera ID | `multipart/x-mixed-replace` stream of JPEG frames. |
| `GET /api/detections` | None | Current detector tracks as detection records (`track_id`, confidence, bbox, timestamp, camera ID). |
| `GET /api/tracks` | None | Active tracker records with first/last seen, zone, dwell, face status, and confidence. |
| `GET /api/alerts` | None | Alerts newest first. `snapshotUrl` is a short-lived signed evidence URL when a snapshot exists. |
| `POST /api/alerts/{id}/confirm` | Alert ID | Marks status `CONFIRMED_THREAT`. |
| `POST /api/alerts/{id}/dismiss` | Alert ID | Marks status `DISMISSED`. |
| `POST /api/alerts/{id}/feedback` | JSON `{ "reason": "..." }` | Marks status `FALSE_POSITIVE` and stores the reason/timestamp. |
| `GET /api/events` | None | Audit events newest first. |
| `GET /api/people` | None | `{ "residents": [...], "unknownPersons": [...], ... }`; snapshot URLs are signed when present. |
| `POST /api/people` | JSON `name`; optional `role`, `avatar_url`, `face_image_base64`, or `face_images_base64` | Resident ID, status, enrolled-photo count, and message. Image count, MIME/magic bytes, per-image size, and rate limits are enforced. |
| `POST /api/people/{id}/re-enroll` | JSON `face_image_base64` or `face_images_base64` | Updated resident face status and enrolled-photo count. 400 for invalid/absent images, 404 for unknown resident, 429 when rate limited. |
| `DELETE /api/people/{id}` | Resident ID | `{ "success": true, "message": ... }` |
| `GET /api/zones` | None | Detection zones with `polygonPoints`, `enabled`, and `dwellThreshold`. |
| `POST /api/zones` | JSON `name`, `polygon_points` (array of `{x,y}`); optional `camera_id`, `type`, nullable `dwell_threshold`, `enabled`, `color` | New zone ID and message. |
| `PUT /api/zones/{id}` | Same JSON shape as create | Success and message. |
| `DELETE /api/zones/{id}` | Zone ID | Success and message. |
| `GET /api/analytics` | None | Aggregate counts, hourly series, pie data, latency histogram, confidence distribution, and uptime percentage. |
| `GET /api/integrations/hikconnect` | None | Current local RTSP status and optional Hik-Connect/HikCentral integration status. |
| `GET /api/evaluation/latest` | None | `INSUFFICIENT_DATASET` plus the current clip inventory and `metrics: null` until real labelled clips are present and a report has completed. Completed responses include held-out metrics and sample size. |
| `GET /api/evidence/{file_path}` | Bearer/API key **or** valid `exp` and `sig` query parameters | Evidence file bytes; 401 if neither auth method succeeds, 400 for path traversal, 404 if absent. |

## WebSocket routes

| Path | Authentication | Messages |
| --- | --- | --- |
| `/ws/cameras/{camera_id}` | Bearer token or API key. Browser clients may pass `?token=` or `?api_key=`. | Server sends camera state about every 200 ms. Unknown/offline camera IDs receive a clear `status: "OFFLINE"` state with no tracks. |
| `/ws/test-camera` | Bearer token or API key. Browser clients may pass `?token=` or `?api_key=`. | Client sends JPEG bytes or JSON `{ "image": "data:image/jpeg;base64,...", "dwell_threshold": 10, "zones": [{"name":"entry","polygonPoints":[{"x":0,"y":0}, ...],"enabled":true}] }`. `polygon` is accepted as a legacy alias. Server sends test mode, tracks, a decision, latency, and dropped-frame count. Frames over `MAX_WS_FRAME_BYTES` receive `{ "error": ..., "code": "FRAME_TOO_LARGE" }`; the connection stays open. |

WebSocket authentication failures close with code **1008**. WebSockets do not use the HTTP JSON error envelope.

## Evaluation response behavior

`GET /api/evaluation/latest` reads the current `evaluation/dataset/labels.csv` and clip inventory. Zero clips, extra unlabelled files, invalid labels, or a missing completed report do not produce metric values. The response uses `status: "INSUFFICIENT_DATASET"`, includes inventory details (including missing labelled files), and sets `metrics` to `null`. A completed report exposes metrics computed only on the held-out split; its sample size is returned alongside them. Old reports are not served as current results when no clips are on disk or the inventory contains unlabelled/invalid files.
