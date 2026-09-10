# Smart Vision Sentry 🛡️

> **Edge-AI CCTV False-Alarm Elimination & Residential Security Prototype**  
> *Replacing pixel-motion notifications with semantic human detection, loitering dwell tracking, and resident verification.*

---

## 📌 Project Overview

**Smart Vision Sentry (SVS)** is a prototype Edge-AI video analytics platform designed to address the universal problem of traditional CCTV security systems: **Notification Fatigue**.

Traditional motion sensors trigger indiscriminate alerts for swaying foliage, wind, sunlight/shadow shifts, insects, and animals, generating frequent false alarms daily and forcing residents to mute security notifications. 

Smart Vision Sentry introduces a **Triple-Gate AI Decision Pipeline** that evaluates semantic human presence, temporal loitering duration, and resident face verification before firing an alert.

```
HIKVISION CCTV / RTSP STREAM / WEBCAM
            ↓
  OPENCV & FFMPEG FRAME BUFFER
            ↓
┌─────────────────────────────────────────────────────────────┐
│                   TRIPLE-GATE AI PIPELINE                   │
│                                                             │
│  [GATE 1]  Human Detection   →  YOLOv8 Silhouette Detection │
│  [GATE 2]  Loitering Track   →  Dwell Duration > 20 Seconds │
│  [GATE 3]  Resident Verification → Unrecognized / Unknown   │
└─────────────────────────────────────────────────────────────┘
            ↓
  VERIFIED SECURITY ALERT (< 2.0s Latency Target)
            ↓
  WEB DASHBOARD & TELEGRAM BOT API
```

---

## 🎯 Target Impact Benchmarks (Prototype Metrics)

| Metric | Traditional Motion CCTV | Smart Vision Sentry (Target) | Evaluation Metric |
| :--- | :---: | :---: | :---: |
| **Daily False Positive Alerts** | 99+ pings / day | **< 4 verified alerts / day** | Target Reduction |
| **Daily Log-Checking Time** | 20 minutes / day | **< 1 minute / day** | Operational Time Saved |
| **Alert Delivery Latency** | 3.5 – 5.0s (Cloud) | **< 1.4s (Local Edge)** | Measured Latency Target |
| **Cloud Video Processing Fees** | $150+ / month | **$0 / month (100% Edge Processing)** | Processing Model |

*Note: Metrics represent design targets evaluated under controlled test scenarios.*

---

## 🏗️ Architecture & Technology Stack

### **Backend (Python 3.10+ & FastAPI)**
- **Framework**: FastAPI + Uvicorn (REST API & WebSockets)
- **Object Detection**: Ultralytics YOLOv8 (Human Silhouette Detection) with OpenCV fallback
- **Object Tracking**: Lightweight IoU-Based Object Tracker with frame-to-frame association, multi-person track IDs, and stale track cleanup
- **Face Verification**: Prototype Face Verification Engine using normalized 512-D feature vector cosine similarity matching against whitelisted SQLite resident embeddings
- **Camera Streaming**: Continuous thread RTSP/Webcam capture with real measured FPS & MJPEG server (`/api/cameras/{id}/mjpeg`)
- **ONVIF Discovery**: Native UDP WS-Discovery scanner on port 3702 for automatic LAN IP camera detection
- **Database & Sync**: Local SQLite3 (`backend/data/smart_vision.db`) with optional Supabase Cloud synchronization

### **Frontend (React 18 & Dashboard)**
- **Framework**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS (Modern NOC Dark Theme)
- **Icons & Charts**: Lucide React, Recharts
- **Video Renderer**: Dual HTML5 Canvas + MJPEG player rendering camera feeds with bounding box, track ID, and face tag overlays
- **Deployment**: Vercel monorepo hosting (`https://smart-vision-eta.vercel.app`)

---

## ⚡ Triple-Gate Decision Engine Logic

An alert is classified as **VERIFIED_THREAT** only when all three gates evaluate to PASS:

1. **GATE 1 — Human Detection**:
   - Evaluates whether a human silhouette is present with `human_confidence >= 0.70`.
   - Filters out environmental motion (foliage, shadows, animals, rain).

2. **GATE 2 — Loitering Dwell Duration**:
   - Tracks human movement trajectories inside designated corridor protection zones.
   - *Pass Condition*: `Dwell Duration >= 20 Seconds`.

3. **GATE 3 — Resident Identity Verification**:
   - Compares detected face features against whitelisted resident database.
   - *Pass Condition*: `Face Status == UNKNOWN`.
   - *Safe State*: If face matches a whitelisted resident, system logs `SAFE_RESIDENT` and suppresses notification.

---

## 🌐 Edge-AI Deployment Architecture

```
Browser Dashboard (Vercel Frontend)
       ▲
       │ REST API / WebSockets
       ▼
Local Edge Machine (FastAPI Backend)
       ▲
       │ RTSP Stream / ONVIF Discovery / OpenCV
       ▼
IP Camera / Hikvision / USB Webcam
```

- **Vercel**: Hosts the static dashboard user interface.
- **Local Edge Machine**: Runs the Python FastAPI backend, OpenCV capture, YOLO inference, tracking, and local SQLite database.
- Physical video streams are processed locally on the Edge machine and are not uploaded to Vercel.

---

## ⚙️ Edge Backend Setup & Architecture

### **Local Edge Server Architecture**
Smart Vision Sentry runs its high-performance AI inference engine directly on local premises hardware (Edge Machine) to guarantee sub-1.4 second alert delivery latencies and complete privacy.

```
┌──────────────────────────────────────────────────────────────────┐
│                      LOCAL EDGE MACHINE (PYTHON 3.10)            │
│                                                                  │
│   ┌───────────────┐     ┌────────────────┐     ┌───────────────┐ │
│   │ RTSP Capture  │ ──> │ YOLOv8 Human   │ ──> │ Lightweight   │ │
│   │ (OpenCV Feed) │     │ Detector       │     │ IoU Tracker   │ │
│   └───────────────┘     └────────────────┘     └───────────────┘ │
│                                                        │         │
│   ┌───────────────┐     ┌────────────────┐             ▼         │
│   │ SQLite DB     │ <── │ Prototype Face │ <── [Triple-Gate    │ │
│   │ & Audit Log   │     │ Matcher (512D) │     Decision Engine]│ │
│   └───────────────┘     └────────────────┘                       │
└──────────────────────────────────────────────────────────────────┘
```

### **Edge Connection States**
The system explicitly measures and reports edge hardware status across 4 verified states:
1. **LIVE**: Backend online with active RTSP/Webcam stream producing real-time frames.
2. **CONNECTED_CAMERA_OFFLINE**: FastAPI backend reachable, but local camera stream is disconnected or unreachable.
3. **CONNECTED_NO_CAMERA**: FastAPI backend connected on LAN, but no camera is registered to the active profile.
4. **NOT_CONNECTED**: Backend server unreachable (Vercel static cloud deployment active in Demo Mode).

### **Local Hardware & Network Requirements**
- **Supported Video Inputs**: RTSP Stream (Hikvision/Dahua/ONVIF, H.264/H.265), USB Webcam (`host: "0"`), or pre-recorded local `.mp4` file.
- **Port Bindings**: Port `8000` (FastAPI REST API & WebSocket server), Port `554` (Default RTSP Video Stream).
- **Network Isolation**: Local RTSP camera IP addresses (e.g. `192.168.1.104`) remain strictly on local LAN subnets. Vercel web client connects over local network REST/WebSocket sockets or operates safely in Demo Mode.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+)

### 1. Clone Repository
```bash
git clone https://github.com/Prathap2349/Smart-Vision.git
cd Smart-Vision
```

### 2. Backend Setup (FastAPI & AI Engine)
```bash
# Create Python Virtual Environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install Python Dependencies
pip install -r backend/requirements.txt pytest

# Run Backend Automated Test Suite
python -m pytest backend/tests/test_pipeline.py -v

# Start FastAPI Backend Server (Runs on http://localhost:8000)
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup (React Dashboard)
```bash
# Install Node Dependencies
npm install

# Build & Validate Frontend TypeScript Compilation
npm run build

# Start Vite Dev Server (Runs on http://localhost:5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Simulation / Demonstration Mode

Smart Vision Sentry includes an interactive **Simulation Mode** designed for demonstration when a physical IP camera is unavailable:
- **Simulate Intruder**: Generates a tracked subject (`#101`) entering the protection zone, increasing dwell time until the Triple-Gate evaluates to `VERIFIED_THREAT`.
- **Simulate Resident**: Generates a whitelisted resident subject (`Arun Kumar`), demonstrating alert suppression (`SAFE_RESIDENT`).
- All simulated events carry an explicit `[SIMULATION]` / `[DEMO EVENT]` badge to distinguish generated demonstration data from live camera measurements.

## 📹 Testing Without Camera Hardware

The AI detection pipeline requires a live camera feed (an RTSP stream or attached USB webcam) to execute YOLO object detection and produce security alerts. On a test machine with no camera connected, the dashboard will correctly report an `OFFLINE` camera status and show empty detection lists — **this is the expected behaviour when idle and does not indicate a system error**.

To evaluate the live pipeline on a machine without an IP camera:
1. **USB Webcam Evaluation**: Attach a standard USB webcam and set `HIKVISION_HOST="0"` or point camera configuration to index `0` in `backend/.env`.
2. **Video File Evaluation**: Pass a local `.mp4` video file path to the camera configuration to stream pre-recorded test footage through the continuous YOLO + IoU tracking pipeline.
3. **Interactive Simulation Mode**: If no camera source is available, toggle **Simulation Mode** in the dashboard banner to test interactive intruder loitering alerts and resident verification workflows.

---

## ⚠️ Prototype Limitations

1. **Local Edge Processing**: Camera processing, YOLO inference, and RTSP stream decoding require the Python backend running locally.
2. **Camera Hardware**: Real-time camera streaming requires an RTSP IP camera (e.g. Hikvision) or an attached USB webcam.
3. **Face Verification Prototype**: The current face verification module uses a 512-D normalized feature vector similarity prototype; production deployment can upgrade to full InsightFace ArcFace models.
4. **Environment Credentials**: Credentials must be supplied via environment variables (`.env`) using the provided `.env.example` templates.

---

## 👥 Project & Evaluation Metadata

- **Student Name**: Prathap S (Roll No: 25102159 / RTC2025BAI360)
- **Department**: BTech AI & Data Science (C29 Batch)
- **Institution**: Rathinam Technical Campus
- **Site Location**: Residential Corridor Installation
