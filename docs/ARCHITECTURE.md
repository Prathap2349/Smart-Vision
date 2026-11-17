# Architecture and decision rules

## Processing flow

```mermaid
flowchart TD
  A[RTSP capture thread per camera] --> B[Latest frame]
  B --> C[YOLO person detections]
  C --> D[Per-camera IoU tracker]
  D --> E[Polygon zone match and dwell clock]
  D --> F[Track-cached InsightFace recognition]
  E --> G[Decision engine]
  F --> G
  G -->|threat or unverified loiterer| H[Alert row and evidence snapshot]
  H --> I[Bounded Telegram dispatch queue]
  G --> J[Per-camera WebSocket state]
  K[Browser webcam frames] --> L[/ws/test-camera receiver]
  L --> M[Single latest-frame slot]
  M --> N[Worker-thread inference]
  N --> G
```

Each enabled camera gets a `CameraPipeline` with its own RTSP capture, tracker, and detection loop, managed by the pipeline registry. Zone definitions are read from SQLite into a cache; resident embeddings are held in an in-memory cache. Telegram network calls run on a bounded background queue. The camera-test WebSocket replaces stale pending frames and executes inference in a worker thread.

## Decision gates

The decision engine in `backend/ai/decision_engine.py` evaluates a person track as follows:

1. **Gate 1 — human confidence:** the detection must represent a human and have confidence greater than or equal to `GATE_HUMAN_CONFIDENCE_THRESHOLD` (default `0.70`). YOLO's earlier candidate cutoff is `DETECTOR_CONFIDENCE_THRESHOLD` (default `0.65`).
2. **Gate 2 — dwell:** zone dwell seconds must be greater than or equal to the effective dwell threshold.
3. **Gate 3 — resident/face state:** a known resident (`KNOWN`/`VERIFIED_RESIDENT`) is always `SAFE_RESIDENT` and suppresses alerts. `UNKNOWN` passes Gate 3 and, when the first two gates pass, produces `VERIFIED_THREAT` with `CRITICAL` severity. `NO_FACE` or `LOW_QUALITY` produces `UNVERIFIED_LOITERER` with `HIGH` severity when `ALERT_ON_UNVERIFIED_FACE=true` (default); when disabled, it remains monitored without an alert. `UNCLEAR`/`LOW_LIGHT_IR` or the explicit IR fallback uses the fast-mode Gate 3 path.

An alert requires Gate 1 and Gate 2 and an eligible Gate 3 state. If a known resident is matched, resident suppression takes precedence even when dwell is long.

## Dwell threshold precedence

`DecisionEngine.resolve_dwell_threshold()` applies this order:

- With no explicit zone threshold, use the active schedule profile (`DAY_STANDARD` is 20 seconds; `NIGHT_STRICT` is 10 seconds by default).
- During day/standard profile, an explicit zone threshold overrides the schedule value.
- During `NIGHT_STRICT`, use the stricter minimum of the zone value and night profile value. For example, a zone set to 25 seconds resolves to 10 seconds at night; a zone set to 5 seconds remains 5 seconds.

The default zones seeded in SQLite have a 20-second explicit value, so they resolve to 20 seconds in the day profile and 10 seconds at night. The camera-test WebSocket has its own request dwell value (default 10 seconds) and passes that value to the decision engine.

## Configuration thresholds

The runtime values are defined in `backend/config.py`: detector confidence `0.65`, Gate 1 human confidence `0.70`, face embedding similarity `0.50`, minimum face size `32` px, minimum blur score `30`, and face recognition interval `1.0` second by default. Confidence cutoffs refer to different pipeline stages and should not be interchanged.
