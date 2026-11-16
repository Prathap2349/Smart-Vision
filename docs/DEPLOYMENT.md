# Deployment

The API and WebSocket endpoint must use a public HTTPS/WSS URL when the frontend is hosted on Vercel. Browsers block insecure HTTP/WS calls from an HTTPS page (mixed content). Set `VITE_API_BASE_URL` to the backend origin plus `/api`, and `VITE_WS_BASE_URL` to the backend origin without a path.

## Vercel frontend variables

Set these in the Vercel project and redeploy after changing them:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (this is designed for browser use; protect data with RLS) |
| `VITE_API_BASE_URL` | `https://<public-backend-host>/api` |
| `VITE_WS_BASE_URL` | `wss://<public-backend-host>` |

Do not put `API_KEY`, `CAMERA_SECRET`, `SUPABASE_JWT_SECRET`, or `SUPABASE_KEY` in a `VITE_` variable. Vite embeds `VITE_` values into public browser assets. The frontend uses the signed-in Supabase access token; `API_KEY` is for trusted scripts and service-to-service calls.

## Backend environment

Set backend secrets in the host's secret manager, not in source control. `DEV_MODE=false` is required on hosted deployments. Startup refuses to run without `CAMERA_SECRET` and at least one of `API_KEY` or `SUPABASE_JWT_SECRET`.

| Variable | Purpose |
| --- | --- |
| `DEV_MODE` | Set `false` in hosted environments. `true` bypasses authentication for local development only. |
| `CAMERA_SECRET` | Stable secret for camera-password encryption and evidence URL signatures. Required in production and should be kept unchanged across restarts. Local `DEV_MODE=true` can create a random key at `DATA_DIR/.camera_secret.dev`. |
| `API_KEY` | Optional static key for trusted scripts. Use a long random value. |
| `SUPABASE_JWT_SECRET` | Optional JWT signing secret if validating Supabase HS256 JWTs locally. |
| `SUPABASE_URL` | Supabase project URL; leave empty if unused. |
| `SUPABASE_KEY` | Backend Supabase service key if cloud sync is enabled. Keep private. |
| `ALLOWED_ORIGINS` | Comma-separated exact frontend origins, for example `https://your-app.vercel.app`. |
| `DATA_DIR` | Writable persistent data directory; defaults to `backend/data` locally. Container default is `/data`. |
| `MODELS_DIR` | Model storage path; defaults to `${DATA_DIR}/models`. Container uses baked models under `/opt/models`. |
| `HIKVISION_HOST` | Local camera host/IP. Cloud hosts cannot reach a private `192.168.x.x` LAN address. |
| `HIKVISION_RTSP_PORT` | RTSP port (default `554`). |
| `HIKVISION_USERNAME` / `HIKVISION_PASSWORD` | Camera credentials used by local setup defaults. Prefer adding credentials through the authenticated camera API. |
| `HIKVISION_CHANNEL` | Camera channel (default `101`). |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Optional Telegram alert integration. |
| `ALERT_ON_UNVERIFIED_FACE` | Alert on loitering when the face is not visible (default `true`). |
| `MAX_ENROLLMENT_PHOTOS` | Enrollment image count limit (default `10`). |
| `MAX_ENROLLMENT_IMAGE_BYTES` | Per-image byte limit (default `5242880`). |
| `ENROLLMENT_RATE_LIMIT_PER_MIN` | Enrollment request limit (default `10`). |
| `MAX_WS_FRAME_BYTES` | WebSocket image/frame byte limit (default `2097152`). |
| `FACE_MIN_SIZE` / `FACE_MIN_BLUR_SCORE` | Passive face quality thresholds. |
| `FACE_SIMILARITY_THRESHOLD` | Face embedding match threshold. |
| `TRACK_RECOGNITION_INTERVAL` | Seconds between per-track face checks. |
| `INSIGHTFACE_MODEL_NAME` | InsightFace pack name (default `buffalo_s`). |

## A. Local Mac backend + tunnel + Vercel (recommended review demo)

This keeps inference on the Mac, can use CoreML, and can connect to RTSP cameras on the same LAN. Start `scripts/run_local_with_tunnel.sh`; it starts Uvicorn and either Cloudflare Tunnel (quick tunnel) or ngrok, then prints the public HTTPS/WSS URLs. Set those URLs as the two Vercel variables above. For a stable ngrok URL, configure the ngrok account/token first. A Cloudflare quick tunnel URL changes between runs.

Keep `DATA_DIR` on local persistent disk. Configure `CAMERA_SECRET` and either API key or JWT secret in `backend/.env`, and set `DEV_MODE=false` while the tunnel is running. A tunnel exposes the backend to the internet; never expose a development-mode backend that bypasses authentication.

## B. Hugging Face Spaces (Docker)

Create a Docker Space, choose an appropriate CPU tier, and deploy this repository. Set `PORT=7860` if that Space expects port 7860; the image honors `$PORT`. Set the backend variables above, with `DEV_MODE=false` and `ALLOWED_ORIGINS` containing the Vercel origin. Attach persistent storage and set `DATA_DIR` to its mount path if the selected Space plan supports it. Without persistent storage, SQLite/evidence data may be lost when the container is replaced. Keep `MODELS_DIR=/opt/models` so the pre-downloaded image models remain visible. CPU inference may be slow; the Space cannot reach a private LAN camera, so use browser-webcam frames for a cloud demo. Confirm the selected Space plan's current CPU, storage, and runtime limits before relying on it.

## C. Railway Hobby/paid plan

The Railway trial is account-level; recreating a project does not restore it. Use Railway only after upgrading to an eligible paid/Hobby plan. Add a persistent volume mounted at `/data`. Deploy from the repository Dockerfile and configure:

- Start command: Dockerfile default (`uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}`).
- `PORT`: provided by Railway.
- `DATA_DIR=/data`, `MODELS_DIR=/opt/models`, `DEV_MODE=false`.
- `CAMERA_SECRET` and either `API_KEY` or `SUPABASE_JWT_SECRET`.
- `ALLOWED_ORIGINS=https://<your-vercel-domain>`.
- Add `SUPABASE_URL` and `SUPABASE_KEY` only if backend Supabase integration is used.
- Add Telegram variables only if Telegram alerts are enabled.

A Railway cloud container cannot connect to an RTSP camera at a private `192.168.x.x` address. Use browser-webcam frames or a separately secured network path for hosted review. Verify volume attachment and health status after deployment.
