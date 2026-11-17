# Smart Vision Sentry 🛡️

> **Edge-AI CCTV False-Alarm Elimination & Residential Security System**  
> *Combining YOLOv8 silhouette detection, IoU loitering tracking, and InsightFace ArcFace biometric verification.*

[![CI](https://github.com/Prathap2349/Smart-Vision/actions/workflows/ci.yml/badge.svg?branch=phase-3-hardening)](https://github.com/Prathap2349/Smart-Vision/actions/workflows/ci.yml)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.6-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![InsightFace](https://img.shields.io/badge/InsightFace-ArcFace%20512--D-blueviolet)](https://github.com/deepinsight/insightface)
[![YOLOv8](https://img.shields.io/badge/Ultralytics-YOLOv8-FF6F00?logo=yolo)](https://docs.ultralytics.com)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
![Backend tests](https://img.shields.io/badge/backend%20tests-85%20passed-brightgreen)

---

## 1. Project Architecture

Smart Vision Sentry (SVS) is an Edge-AI video analytics prototype designed to distinguish people and dwell behavior from environmental motion. Real-world accuracy has not yet been measured. The system is designed to execute locally on edge hardware (Apple Silicon with CoreML, NVIDIA Jetson, or x86 CPU).

```
RTSP Camera Stream / Video Feed
            │
            ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 1. FRAME DECODE & CAPTURE                                   │
 │    OpenCV / FFmpeg Ring Buffer (Decoupled Capture Thread)   │
 └──────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 2. YOLOV8-NANO SILHOUETTE DETECTION                         │
 │    COCO Class 0 (Person), candidate threshold 0.65           │
 └──────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 3. LIGHTWEIGHT IOU MULTI-OBJECT TRACKING                    │
 │    Bounding Box Association, Point-in-Polygon ROI Checker,  │
 │    Dwell Timer (now - zone_entry_time), Track History Cache │
 └──────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 4. BIOMETRIC FACE VERIFICATION (INSIGHTFACE + ARCFACE)      │
 │    • SCRFD 500M Face Detector & 5-Point Landmark Alignment  │
 │    • Passive Face Quality Check (Resolution & Blur Var)     │
 │    • 512-D ArcFace MobileFaceNet Embedding Extraction       │
 │    • Vectorized Matching vs In-Memory ResidentCache (0 I/O) │
 └──────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 5. TRIPLE-GATE DECISION ENGINE                              │
 │    Gate 1: Human confidence ≥ 0.70                           │
 │    Gate 2: Dwell ≥ zone/schedule threshold                   │
 │    Gate 3: unknown threat; hidden face unverified alert       │
 └──────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 6. ALERT MANAGER & EVIDENCE DISPATCH                        │
 │    Cooldown Throttling, JPEG Snapshot, Telegram Bot API     │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Triple-Gate Decision Pipeline

Traditional CCTV motion detectors generate dozens of false notifications daily. Smart Vision Sentry uses three cascading decision gates before firing an alert:

1. **Gate 1 (Human Presence):** YOLO's candidate cutoff is `0.65`; Gate 1 then requires human confidence `>= 0.70`. Both are configured in `backend/config.py`.
2. **Gate 2 (Loitering Duration):** An IoU tracker measures dwell in configured polygon zones. An explicit zone threshold is used during the day; at night the effective value is the lower of the zone threshold and the night profile. Without a zone value, the schedule supplies the threshold (20 seconds day, 10 seconds night by default).
3. **Gate 3 (Identity and face visibility):** A known resident is safe and suppresses alerts. An `UNKNOWN` face can produce `VERIFIED_THREAT` (critical). `NO_FACE` or `LOW_QUALITY` produces `UNVERIFIED_LOITERER` (high) when `ALERT_ON_UNVERIFIED_FACE=true`; this labels a loiterer whose face cannot be verified. Face similarity defaults to `0.50` in `backend/config.py`.

---

## 3. InsightFace & ArcFace Integration

* **Face Detector:** SCRFD 500M (`det_500m.onnx`) with 5-point landmark alignment.
* **Feature Extractor:** ArcFace MobileFaceNet (`w600k_mbf.onnx`), producing normalized 512-dimensional feature vectors.
* **Execution Provider:** Automatically uses `CoreMLExecutionProvider` on Apple Silicon for hardware NPU/GPU acceleration, falling back to `CPUExecutionProvider` on other architectures.
* **Strict Engine Requirement:** The system explicitly checks and requires InsightFace/ArcFace. It does **not** silently fall back to legacy prototype matchers.

---

## 4. Resident Enrollment Flow

Enrollment is managed via `POST /api/people` and `POST /api/people/{id}/re-enroll`:
1. Accepts 3–5 face photos per resident representing varied angles (front, slight left, slight right) and lighting.
2. For every photo, executes strict quality validation:
   * **Face Detection:** Locates primary face bounding box.
   * **Minimum Resolution:** Face bounding box width and height must be $\ge 32 \times 32$ px.
   * **Sharpness Score:** Laplacian variance must be $\ge 30.0$ to reject blurry captures.
3. Extracts and normalizes a 512-D ArcFace vector for each valid photo.
4. Stores the collection of vectors in SQLite (`embedding_json`) and immediately invalidates the in-memory cache.

---

## 5. Multiple Embeddings Per Resident

Rather than blindly averaging vectors into a single degraded centroid, Smart Vision Sentry preserves all $N$ individual enrollment embeddings for each resident:
$$\text{Sim}(q, \text{Resident}_k) = \max_{j=1 \dots N} \left( \frac{q \cdot e_{k, j}}{\|q\| \|e_{k, j}\|} \right)$$
During inference, the query vector is compared against all stored embeddings of each resident using vectorized matrix operations in RAM.

---

## 6. Recognition Caching

To prevent redundant neural inference on every frame:
* **Track-Level Recognition Cache:** When a tracked subject is evaluated, the result is cached on `TrackedSubject`.
* **Re-verification Throttling:** `TrackedSubject.should_verify_face()` enforces a configurable interval (`TRACK_RECOGNITION_INTERVAL = 1.0s`). Once an identity is confirmed (`KNOWN`), re-verification frequency is throttled to conserve compute while maintaining continuous security.
* **Re-ID Recovery:** Cached ArcFace embeddings allow recovering track identity across temporary occlusions.

---

## 7. Performance Architecture

* `ResidentCache` keeps verified resident embeddings in memory and refreshes on mutation.
* Each camera loop caches zones between refreshes rather than querying SQLite on every frame.
* See the committed benchmark reports for measured hardware-specific performance; no universal latency is claimed here.

---

## 8. Benchmark Commands

Run the CLI benchmark suite to measure single-stream stage latencies and multi-stream concurrency:

```bash
# Activate virtual environment
source .venv313/bin/activate

# 1. Standard Single-Stream + Multi-Stream Benchmark (500 frames, 1/2/4/8 streams)
PYTHONPATH=./backend python backend/benchmarks/benchmark_pipeline.py --frames 500 --streams 1 2 4 8

# 2. Benchmark on custom video source
PYTHONPATH=./backend python backend/benchmarks/benchmark_pipeline.py --source path/to/video.mp4

# 3. 30-Minute Continuous Endurance Mode
PYTHONPATH=./backend python backend/benchmarks/benchmark_pipeline.py --duration 1800
```

*Benchmark outputs are saved to `backend/benchmarks/results/` (`.json`, `.csv`, and `.png` plots).*

---

## 9. Evaluation Commands

Run the evaluation tooling against real, labelled clips only:

```bash
# Validate that real clip files and labels agree
PYTHONPATH=./backend python scripts/validate_evaluation_dataset.py

# Enroll consenting residents from evaluation/dataset/enrollment/<name>/ photos
PYTHONPATH=./backend python scripts/enroll_evaluation_residents.py

# Run the evaluation; with no real clips it writes INSUFFICIENT_DATASET and inventory only
PYTHONPATH=./backend python backend/evaluation/run_evaluation.py

# Run evaluation with custom threshold and skip threshold sweep
PYTHONPATH=./backend python backend/evaluation/run_evaluation.py --threshold 0.50 --no-sweep
```

*The evaluator writes `evaluation/results/results.json` and `results.md`. It does not emit accuracy metrics until real clips are present and processed.*

Current real clip inventory: **0 clips on disk; 20 labelled clip rows are missing their video files.** No accuracy metrics are available. See the [real clip recording checklist](docs/EVALUATION_CHECKLIST.md) before collecting footage.

---

## 10. Dataset Structure

The full dataset is organized in `evaluation/dataset/` across 11 scenarios with ground-truth labels in `labels.csv`. The checklist explains camera placement, consent, filming, and a 10–12 clip minimum viable first evaluation. The complete scenario matrix uses two clips per scenario.

```
evaluation/dataset/
├── labels.csv
├── empty_corridor/        # Negative: static corridor, no motion
├── shadows_wind/          # Negative: tree shadows and sunlight shifts
├── animals/               # Negative: cats and dogs in corridor
├── resident/              # Negative: resident passing through (< 20s)
├── resident_lingering/    # Negative: resident lingering (> 20s) [ArcFace suppression]
├── delivery_person/       # Negative: courier drop-off (< 20s)
├── unknown_loitering/     # Positive: unknown stranger loitering (> 20s) [Threat]
├── night_low_light/       # Mixed: night-time IR transit (< 10s) vs loitering (> 10s)
├── multiple_people/       # Mixed: groups, resident with guests
├── occlusion/             # Positive: stranger loitering behind partial pillar
├── mask_cap/              # Positive: stranger wearing cap/mask loitering (> 20s)
└── enrollment/            # Reference enrollment photos (separate from test footage)
```

---

## 11. Metric Definitions

* **True Positive (TP):** Ground-truth threat clip correctly alerted by Triple-Gate.
* **False Positive (FP):** Ground-truth benign clip incorrectly alerted.
* **True Negative (TN):** Ground-truth benign clip where system remained quiet.
* **False Negative (FN):** Ground-truth threat clip missed by system.
* **Precision:** $\frac{TP}{TP + FP}$
* **Recall:** $\frac{TP}{TP + FN}$
* **F1 Score:** $\frac{2 \cdot \text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$
* **False Alarms per Hour:**
  $$\text{False Alarms / Hour} = \frac{\text{FP count}}{\text{Total Duration (Hours) of Negative-Scenario Clips}}$$
* **Resident Recognition Accuracy:** $\frac{\text{Correctly Identified Resident Clips}}{\text{Total Resident Clips}}$
* **False Accept Rate (FAR):** Intruder loitering clips falsely accepted as resident.
* **False Reject Rate (FRR):** Resident clips falsely rejected and alerted.

---

## 12. Threshold Selection Methodology

To prevent overfitting:
1. Available dataset clips are split into a **Tuning Set (50%)** and a **Held-Out Test Set (50%)**.
2. A similarity threshold sweep ($0.30 \to 0.70$ in $0.05$ increments) is executed **strictly on the Tuning Set** to select the optimal threshold $T^*$ that maximizes F1.
3. Threshold $T^*$ is **frozen**.
4. Final reported performance metrics and baseline comparisons are calculated exclusively on the **Held-Out Test Set**.

---

## 13. System Limitations & Disclaimers

> [!IMPORTANT]
> 1. **Passive Face Quality Filtering:** Laplacian sharpness and bounding-box resolution filtering reject degraded images; **this is passive quality filtering, not full 3D/liveness anti-spoofing detection.**
> 2. **Hardware Dependency:** Latency and FPS depend on the host hardware and execution provider (`CoreMLExecutionProvider` on Apple Silicon, CUDA on NVIDIA, or CPU).
> 3. **Repeated-Video Multi-Stream Testing:** Multi-stream benchmarks utilizing looped or synthetic streams test concurrency and hardware throughput; they are **not 8 physical independent camera sensors**.
> 4. **Dataset Dependency:** Real-world FP/FN metrics depend on physical clip recordings; when clips are missing, the system reports missing inventory rather than fabricating synthetic scores.
> 5. **Data Separation:** Threshold tuning and evaluation metrics must always use distinct data splits.

---

## 14. Deployment & Verification

The recommended review setup is the Vercel frontend with a local Mac backend exposed through Cloudflare Tunnel or ngrok. Local processing can use CoreML and reach an RTSP camera on the same LAN. Hosted cloud backends cannot directly reach private `192.168.x.x` cameras; use browser-webcam frames for a cloud demo. Docker/Hugging Face Spaces and an eligible paid Railway plan are documented options.

```bash
# Backend tests and frontend build
PYTHONPATH=./backend pytest backend/tests -q
npm ci && npm run build

# Local backend + tunnel launcher (requires cloudflared or ngrok)
scripts/run_local_with_tunnel.sh
```

Read [Deployment](docs/DEPLOYMENT.md) for host setup, environment variables, and the HTTPS/WSS mixed-content requirement. API auth and evidence URLs are described in [API](docs/API.md). See [Database](docs/DATABASE.md), [Testing](docs/TESTING.md), and [Architecture](docs/ARCHITECTURE.md) for implementation details.

The CI workflow tests the backend on Python 3.11, builds the frontend, and runs a separate Docker image build job.

---

## 🔒 Privacy Notice
Raw face photos, evaluation video recordings, and local `.env` configuration files are excluded from version control via `.gitignore`. Under `evaluation/`, only `labels.csv` and the evaluation `results.json`/`results.md` are tracked.
