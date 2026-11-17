# Changelog

This changelog summarizes the Phase 1–3 work recorded in the repository history. It describes implementation scope; it does not claim measured detection accuracy.

## Phase 1 — correctness

- `c335d7c`, `e5959ff`, `426413e`, `9b4638b`: normalized zone polygon inputs, added alerts for eligible unverified loiterers, scoped WebSocket state by camera, and applied per-zone/schedule dwell-threshold precedence.
- `a70d645`, `c5576f9`: handled restricted `psutil.boot_time()` access and switched zone IDs to UUIDs with regression coverage.

## Phase 2 — reliability and multi-camera support

- `148341d`, `01307eb`, `cb12cac`: moved Telegram dispatch to a bounded retry queue, moved test-camera inference off the event loop while dropping stale frames, and throttled tracker re-identification.
- `51cd2af`, `b7b3a47`, `1df016c`: added RTSP reconnect/backoff and credential masking, per-camera pipeline management, and orderly FastAPI lifespan startup/shutdown.
- `fed4c7f`: updated benchmark coverage to exercise real zone polygons. The measured benchmark and its limits are documented in [Phase 3 report](docs/PHASE3_REPORT.md).

## Phase 3 — security

- `620b6b3`, `06255be`: enforced JWT/API-key authentication and restricted CORS to configured origins.
- `4548da9`, `c5256ac`: protected evidence access with authentication or signed URLs and encrypted camera passwords at rest.
- `ac22dba`, `a2f95e9`, `0abe6dd`: removed the backend's hardcoded Supabase project URL, validated upload size/type/count and rate limits, and documented the related environment variables.

## Follow-up hardening

Subsequent commits added production fail-closed configuration, deployment packaging, API error/request-ID handling, frontend error boundaries, centralized thresholds, Python 3.11 CI configuration, and honest real-footage evaluation tooling. Current measured verification and deployment limitations are in the [Phase 3 report](docs/PHASE3_REPORT.md).
