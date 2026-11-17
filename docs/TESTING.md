# Testing

## Local commands

```bash
PYTHONPATH=./backend pytest backend/tests -q
npm ci
npm run build
```

The CI backend job uses Python 3.11 and `backend/requirements-ci.txt`. It injects stub YOLO and InsightFace packages through `backend/tests/conftest.py`; no model weights are downloaded and tests do not measure model inference. The Docker image build is a separate CI job and uses the production requirements and model pre-download steps.

## Test coverage

`backend/tests/test_pipeline.py` groups coverage by behavior rather than pytest markers. It exercises zone geometry and dwell timing; YOLO/face-recognizer interfaces with model stubs; gate decisions and schedules; alert persistence, cooldown, bounded Telegram queue and retry; tracker association and Re-ID throttling; enrollment image validation and rate limits; encryption, authentication, CORS, evidence signatures, and production startup requirements; camera reconnect/backoff and multi-camera isolation; health/metrics; evaluation metrics/inventory; deployment settings; and consistent HTTP errors/request IDs.

Some tracker and cache tests use SQLite temp databases or monkeypatches. The enrollment and recognition tests do not use real faces. For real camera behavior or FP/FN performance, use physical streams and the evaluation dataset workflow; unit tests do not establish those results.

## CI jobs

- **Backend tests (Python 3.11):** install the lightweight pinned test dependencies and run `PYTHONPATH=./backend pytest backend/tests -q`.
- **Frontend build:** run `npm ci && npm run build` on Node 20.
- **Docker image build:** build the repository Dockerfile, including build-time YOLO and InsightFace model downloads.
