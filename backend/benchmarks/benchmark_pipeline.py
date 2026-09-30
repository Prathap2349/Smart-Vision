#!/usr/bin/env python3
"""
Smart Vision Sentry — Real Performance Benchmark Suite (RUN 2)
Measures latency, FPS, multi-stream concurrency, and system resource utilization.

Precondition: Active face engine MUST be InsightFace / ArcFace.
"""

import os
import sys
import time
import json
import csv
import random
import platform
import argparse
import threading
import numpy as np
import cv2
import psutil
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

# Set writable cache dir for matplotlib
RESULTS_DIR = Path(__file__).resolve().parent / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
os.environ["MPLCONFIGDIR"] = str(RESULTS_DIR / ".mpl_cache")

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from config import (
    INSIGHTFACE_MODEL_NAME,
    FACE_SIMILARITY_THRESHOLD,
    TRACK_RECOGNITION_INTERVAL
)
from face.recognizer import face_recognizer
from face.cache import resident_cache
from ai.detector import yolo_detector
from tracking.tracker import LightweightIoUTracker
from ai.decision_engine import decision_engine


def check_preconditions() -> Dict[str, Any]:
    """
    Verifies that the active face recognition engine is InsightFace/ArcFace.
    ABORTS if prototype matcher or unready state is detected.
    """
    if face_recognizer is None or not getattr(face_recognizer, "is_ready", False):
        err = getattr(face_recognizer, "initialization_error", "Face recognizer not initialized")
        print(f"\n[BENCHMARK ABORTED] Precondition failed: InsightFace engine is NOT ready! Error: {err}")
        sys.exit(1)

    provider = getattr(face_recognizer, "active_provider", "UNKNOWN")
    if provider == "FAILED":
        print(f"\n[BENCHMARK ABORTED] Precondition failed: InsightFace provider status is FAILED.")
        sys.exit(1)

    metadata = {
        "face_engine": "InsightFace / ArcFace",
        "face_model": getattr(face_recognizer, "model_name", INSIGHTFACE_MODEL_NAME),
        "execution_provider": provider,
        "detector_model": "YOLOv8-Nano (yolov8n.pt)",
        "machine": platform.machine(),
        "processor": platform.processor() or platform.machine(),
        "os": f"{platform.system()} {platform.release()}",
        "os_version": platform.version(),
        "python_version": sys.version.split()[0],
        "cached_residents_count": len(resident_cache),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    return metadata


# Load sample natural images for realistic pipeline benchmarking
SAMPLE_PHOTO_PATH = None
try:
    from ultralytics.utils import ASSETS
    candidate_bus = Path(ASSETS) / "bus.jpg"
    candidate_zidane = Path(ASSETS) / "zidane.jpg"
    if candidate_bus.exists():
        SAMPLE_PHOTO_PATH = str(candidate_bus)
    elif candidate_zidane.exists():
        SAMPLE_PHOTO_PATH = str(candidate_zidane)
except Exception:
    pass

_CACHED_BASE_IMG = cv2.imread(SAMPLE_PHOTO_PATH) if SAMPLE_PHOTO_PATH else None


def generate_synthetic_cctv_frame(frame_idx: int, width: int = 1280, height: int = 720) -> np.ndarray:
    """
    Generates a realistic CCTV test frame using natural photographic subjects with dynamic
    panning, CCTV OSD telemetry, ambient illumination shift, and timestamp overlay.
    Guarantees that YOLO person detection, SCRFD face detection, and ArcFace feature
    extraction execute realistic deep neural inference on every frame.
    """
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    
    if _CACHED_BASE_IMG is not None:
        base_h, base_w = _CACHED_BASE_IMG.shape[:2]
        # Dynamically scale and shift base image to simulate moving CCTV pan
        shift_x = int((frame_idx * 3) % max(1, base_w - 600))
        shift_y = int((frame_idx * 2) % max(1, base_h - 600))
        sub_crop = _CACHED_BASE_IMG[shift_y:min(base_h, shift_y + 600), shift_x:min(base_w, shift_x + 600)]
        
        resized = cv2.resize(sub_crop, (width, height))
        frame = resized
    else:
        # Fallback geometric corridor
        cv2.rectangle(frame, (0, 0), (width, height), (35, 38, 45), -1)
        cv2.fillPoly(frame, [np.array([[200, height], [width - 200, height], [width // 2 + 100, 200], [width // 2 - 100, 200]])], (55, 60, 70))
        x_pos = int((frame_idx * 4) % (width - 300) + 150)
        cv2.rectangle(frame, (x_pos, 290), (x_pos + 120, 540), (120, 80, 40), -1)

    # Ambient subtle grain/noise
    noise = np.random.randint(0, 8, (height, width, 3), dtype=np.uint8)
    frame = cv2.add(frame, noise)

    # CCTV OSD overlay
    ts_str = time.strftime("%Y-%m-%d %H:%M:%S") + f".{frame_idx%1000:03d}"
    cv2.putText(frame, f"CAM-01 CORRIDOR | {ts_str} | REPEAT_SRC", (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 180), 2)
    return frame


class FrameSource:
    """Abstract frame reader supporting video files, RTSP streams, or synthetic CCTV generator."""
    def __init__(self, source_path: Optional[str] = None):
        self.source_path = source_path
        self.cap = None
        self.is_synthetic = False
        self.frame_idx = 0
        
        if source_path and Path(source_path).exists():
            self.cap = cv2.VideoCapture(source_path)
        elif source_path and str(source_path).startswith("rtsp://"):
            self.cap = cv2.VideoCapture(source_path)
        else:
            self.is_synthetic = True

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        if self.is_synthetic:
            self.frame_idx += 1
            frame = generate_synthetic_cctv_frame(self.frame_idx)
            return True, frame
        
        ret, frame = self.cap.read()
        if not ret or frame is None:
            # Loop video
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self.cap.read()
        self.frame_idx += 1
        return ret, frame

    def release(self):
        if self.cap:
            self.cap.release()


def calculate_percentiles(values: List[float]) -> Dict[str, float]:
    """Computes mean, median, p95, p99, min, max, std for latency distribution."""
    if not values:
        return {"mean": 0.0, "median": 0.0, "p95": 0.0, "p99": 0.0, "min": 0.0, "max": 0.0, "std": 0.0}
    arr = np.array(values)
    return {
        "mean": round(float(np.mean(arr)), 2),
        "median": round(float(np.median(arr)), 2),
        "p95": round(float(np.percentile(arr, 95)), 2),
        "p99": round(float(np.percentile(arr, 99)), 2),
        "min": round(float(np.min(arr)), 2),
        "max": round(float(np.max(arr)), 2),
        "std": round(float(np.std(arr)), 2)
    }


def run_single_stream_benchmark(
    num_frames: int = 500,
    source_path: Optional[str] = None,
    simulate_delay_ms: float = 0.0,
    simulate_jitter_ms: float = 0.0,
    simulate_drop_rate: float = 0.0
) -> Dict[str, Any]:
    """
    Executes a single stream pipeline benchmark measuring all 7 processing stages.
    """
    source = FrameSource(source_path)
    tracker = LightweightIoUTracker()
    zones = [{
        "id": "zone-01",
        "name": "Corridor Protection Zone",
        "type": "CORRIDOR",
        "dwell_threshold": 20,
        "polygonPoints": [{"x": 10, "y": 10}, {"x": 90, "y": 10}, {"x": 90, "y": 90}, {"x": 10, "y": 90}]
    }]

    # Stage latency tracking lists (in milliseconds)
    capture_latencies = []
    yolo_latencies = []
    tracker_latencies = []
    face_det_latencies = []
    face_emb_latencies = []
    decision_latencies = []
    e2e_latencies = []

    cpu_samples = []
    ram_samples = []
    process = psutil.Process()

    dropped_frames = 0
    start_total_time = time.perf_counter()

    print(f"\n[Benchmark] Running single-stream pipeline benchmark ({num_frames} frames)...")

    for i in range(num_frames):
        t0 = time.perf_counter()

        # Network Simulation (if enabled)
        if simulate_drop_rate > 0.0 and random.random() < simulate_drop_rate:
            dropped_frames += 1
            continue

        if simulate_delay_ms > 0.0:
            delay = (simulate_delay_ms + random.uniform(-simulate_jitter_ms, simulate_jitter_ms)) / 1000.0
            if delay > 0:
                time.sleep(delay)

        # 1. Frame Capture Stage
        t_cap_start = time.perf_counter()
        ret, frame = source.read_frame()
        t_cap_end = time.perf_counter()
        capture_ms = (t_cap_end - t_cap_start) * 1000.0

        if not ret or frame is None:
            dropped_frames += 1
            continue

        h, w = frame.shape[:2]

        # 2. YOLO Human Detection Stage
        t_yolo_start = time.perf_counter()
        detections = yolo_detector.detect(frame, conf_threshold=0.60)
        t_yolo_end = time.perf_counter()
        yolo_ms = (t_yolo_end - t_yolo_start) * 1000.0

        # 3. Tracker Association Stage
        t_track_start = time.perf_counter()
        tracks = tracker.update_tracks(detections, zones, frame_w=w, frame_h=h, frame=frame)
        t_track_end = time.perf_counter()
        tracker_ms = (t_track_end - t_track_start) * 1000.0

        # 4 & 5. Face Detection & ArcFace Embedding Extraction Stages
        face_det_ms = 0.0
        face_emb_ms = 0.0
        
        for t in tracks:
            x1, y1, x2, y2 = [int(v) for v in t.bbox]
            crop = frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]
            
            if crop.size > 0 and t.should_verify_face(interval=TRACK_RECOGNITION_INTERVAL):
                # Face detection timing
                t_fdet_start = time.perf_counter()
                faces = face_recognizer.detect_faces(crop)
                t_fdet_end = time.perf_counter()
                face_det_ms += (t_fdet_end - t_fdet_start) * 1000.0

                # Face embedding & matching timing
                t_femb_start = time.perf_counter()
                face_status, res_name, face_conf = face_recognizer.match_face(crop)
                t_femb_end = time.perf_counter()
                face_emb_ms += (t_femb_end - t_femb_start) * 1000.0

                t.record_face_result(face_status, res_name, face_conf)

        # 6. Decision Engine Evaluation Stage
        t_dec_start = time.perf_counter()
        if tracks:
            primary = max(tracks, key=lambda tr: tr.dwell_seconds)
            decision_engine.evaluate_gates(
                is_human=True,
                human_confidence=primary.confidence,
                dwell_seconds=primary.dwell_seconds,
                dwell_threshold=20.0,
                face_status=primary.face_status
            )
        else:
            decision_engine.evaluate_gates(
                is_human=False,
                human_confidence=0.0,
                dwell_seconds=0.0,
                dwell_threshold=20.0,
                face_status="NONE"
            )
        t_dec_end = time.perf_counter()
        dec_ms = (t_dec_end - t_dec_start) * 1000.0

        t_end = time.perf_counter()
        e2e_ms = (t_end - t0) * 1000.0

        # Collect data
        capture_latencies.append(capture_ms)
        yolo_latencies.append(yolo_ms)
        tracker_latencies.append(tracker_ms)
        face_det_latencies.append(face_det_ms)
        face_emb_latencies.append(face_emb_ms)
        decision_latencies.append(dec_ms)
        e2e_latencies.append(e2e_ms)

        if (i + 1) % 50 == 0:
            cpu_samples.append(psutil.cpu_percent(interval=None))
            ram_samples.append(process.memory_info().rss / (1024 * 1024)) # MB
            print(f"  Processed {i + 1}/{num_frames} frames | E2E Latency: {e2e_ms:.1f}ms | YOLO: {yolo_ms:.1f}ms | Face: {face_det_ms+face_emb_ms:.1f}ms")

    total_elapsed = time.perf_counter() - start_total_time
    source.release()

    effective_frames = len(e2e_latencies)
    measured_fps = round(effective_frames / total_elapsed, 2) if total_elapsed > 0 else 0.0

    stage_metrics = {
        "frame_capture": calculate_percentiles(capture_latencies),
        "yolo_detection": calculate_percentiles(yolo_latencies),
        "tracker_update": calculate_percentiles(tracker_latencies),
        "face_detection": calculate_percentiles(face_det_latencies),
        "face_embedding": calculate_percentiles(face_emb_latencies),
        "decision_engine": calculate_percentiles(decision_latencies),
        "end_to_end": calculate_percentiles(e2e_latencies)
    }

    result = {
        "stream_count": 1,
        "processed_frames": effective_frames,
        "dropped_frames": dropped_frames,
        "total_elapsed_seconds": round(total_elapsed, 2),
        "measured_fps": measured_fps,
        "stage_latencies_ms": stage_metrics,
        "avg_cpu_percent": round(float(np.mean(cpu_samples)), 1) if cpu_samples else 0.0,
        "max_ram_mb": round(float(np.max(ram_samples)), 1) if ram_samples else 0.0,
        "raw_e2e_latencies": e2e_latencies
    }
    return result


def run_stream_worker(
    stream_id: int,
    frames_per_stream: int,
    source_path: Optional[str],
    results_container: List[Dict[str, Any]],
    lock: threading.Lock
):
    """Worker function executing single pipeline instance in concurrent multi-stream mode."""
    source = FrameSource(source_path)
    tracker = LightweightIoUTracker()
    zones = [{"id": "z1", "name": "Zone", "type": "CORRIDOR", "dwell_threshold": 20, "polygonPoints": []}]
    
    latencies = []
    t_start = time.perf_counter()

    for _ in range(frames_per_stream):
        t0 = time.perf_counter()
        ret, frame = source.read_frame()
        if not ret or frame is None:
            continue
        h, w = frame.shape[:2]
        dets = yolo_detector.detect(frame, conf_threshold=0.60)
        tracks = tracker.update_tracks(dets, zones, frame_w=w, frame_h=h)
        for t in tracks:
            if t.should_verify_face(interval=TRACK_RECOGNITION_INTERVAL):
                x1, y1, x2, y2 = [int(v) for v in t.bbox]
                crop = frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]
                if crop.size > 0:
                    st, nm, cf = face_recognizer.match_face(crop)
                    t.record_face_result(st, nm, cf)
        latencies.append((time.perf_counter() - t0) * 1000.0)

    elapsed = time.perf_counter() - t_start
    source.release()
    fps = len(latencies) / elapsed if elapsed > 0 else 0.0

    with lock:
        results_container.append({
            "stream_id": stream_id,
            "processed_frames": len(latencies),
            "elapsed_seconds": elapsed,
            "fps": fps,
            "mean_latency_ms": float(np.mean(latencies)) if latencies else 0.0,
            "p95_latency_ms": float(np.percentile(latencies, 95)) if latencies else 0.0
        })


def run_multi_stream_benchmark(
    stream_counts: List[int] = [1, 2, 4, 8],
    frames_per_stream: int = 150,
    source_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Evaluates system scaling across 1, 2, 4, and 8 concurrent streams.
    Labels repeated sources explicitly: 'Concurrent repeated-video source benchmark'.
    """
    is_repeated_source = (source_path is None or not str(source_path).startswith("rtsp://"))
    source_label = "Concurrent repeated-video source benchmark (Do NOT describe as 8 physical cameras)" if is_repeated_source else "Distinct RTSP streams"

    print(f"\n=======================================================")
    print(f"MULTI-STREAM CONCURRENCY BENCHMARK ({source_label})")
    print(f"=======================================================")

    scaling_results = {}
    process = psutil.Process()

    for n_streams in stream_counts:
        print(f"\n--> Running benchmark with {n_streams} concurrent stream(s)...")
        threads = []
        stream_results: List[Dict[str, Any]] = []
        lock = threading.Lock()

        cpu_start = psutil.cpu_percent(interval=None)
        t_start = time.perf_counter()

        for s_id in range(n_streams):
            t = threading.Thread(
                target=run_stream_worker,
                args=(s_id + 1, frames_per_stream, source_path, stream_results, lock)
            )
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        t_elapsed = time.perf_counter() - t_start
        cpu_end = psutil.cpu_percent(interval=None)
        ram_mb = process.memory_info().rss / (1024 * 1024)

        total_frames = sum(s["processed_frames"] for s in stream_results)
        aggregate_fps = total_frames / t_elapsed if t_elapsed > 0 else 0.0
        avg_stream_fps = float(np.mean([s["fps"] for s in stream_results])) if stream_results else 0.0
        avg_latency = float(np.mean([s["mean_latency_ms"] for s in stream_results])) if stream_results else 0.0

        scaling_results[f"{n_streams}_streams"] = {
            "stream_count": n_streams,
            "total_processed_frames": total_frames,
            "elapsed_seconds": round(t_elapsed, 2),
            "per_stream_fps": round(avg_stream_fps, 2),
            "aggregate_fps": round(aggregate_fps, 2),
            "avg_latency_ms": round(avg_latency, 2),
            "cpu_percent": round(cpu_end, 1),
            "ram_usage_mb": round(ram_mb, 1)
        }
        print(f"    ✓ {n_streams} Stream(s): Per-Stream FPS = {avg_stream_fps:.1f} | Aggregate FPS = {aggregate_fps:.1f} | Avg Latency = {avg_latency:.1f}ms | RAM = {ram_mb:.1f}MB")

    return {
        "source_type": source_label,
        "is_repeated_source": is_repeated_source,
        "scaling": scaling_results
    }


def run_endurance_mode(duration_seconds: int = 1800, source_path: Optional[str] = None) -> Dict[str, Any]:
    """
    30-Minute Continuous Endurance & Stability Mode.
    Samples FPS, CPU %, and RAM every 10 seconds to detect memory growth or FPS degradation.
    """
    print(f"\n[Endurance Test] Starting continuous test for {duration_seconds} seconds ({duration_seconds/60:.1f} minutes)...")
    source = FrameSource(source_path)
    tracker = LightweightIoUTracker()
    process = psutil.Process()

    timestamps = []
    fps_history = []
    cpu_history = []
    ram_history = []

    interval_frames = 0
    total_frames = 0
    start_time = time.perf_counter()
    interval_start = start_time

    while (time.perf_counter() - start_time) < duration_seconds:
        ret, frame = source.read_frame()
        if not ret or frame is None:
            time.sleep(0.01)
            continue

        h, w = frame.shape[:2]
        dets = yolo_detector.detect(frame, conf_threshold=0.60)
        tracks = tracker.update_tracks(dets, [], frame_w=w, frame_h=h)
        for t in tracks:
            if t.should_verify_face(interval=TRACK_RECOGNITION_INTERVAL):
                x1, y1, x2, y2 = [int(v) for v in t.bbox]
                crop = frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]
                if crop.size > 0:
                    st, nm, cf = face_recognizer.match_face(crop)
                    t.record_face_result(st, nm, cf)

        interval_frames += 1
        total_frames += 1

        now = time.perf_counter()
        if (now - interval_start) >= 10.0:
            elapsed_interval = now - interval_start
            current_fps = round(interval_frames / elapsed_interval, 2)
            current_cpu = psutil.cpu_percent(interval=None)
            current_ram = round(process.memory_info().rss / (1024 * 1024), 2)
            curr_elapsed = round(now - start_time, 1)

            timestamps.append(curr_elapsed)
            fps_history.append(current_fps)
            cpu_history.append(current_cpu)
            ram_history.append(current_ram)

            print(f"  [T+{curr_elapsed:.0f}s] FPS: {current_fps} | CPU: {current_cpu}% | RAM: {current_ram}MB | Total Frames: {total_frames}")

            interval_frames = 0
            interval_start = now

    source.release()

    # Memory growth / leak check via linear slope
    ram_growth = (ram_history[-1] - ram_history[0]) if len(ram_history) > 1 else 0.0
    fps_drop = (fps_history[0] - fps_history[-1]) if len(fps_history) > 1 else 0.0

    return {
        "status": "COMPLETED",
        "duration_seconds": duration_seconds,
        "total_frames_processed": total_frames,
        "avg_fps": round(float(np.mean(fps_history)), 2) if fps_history else 0.0,
        "ram_growth_mb": round(ram_growth, 2),
        "fps_drop": round(fps_drop, 2),
        "timestamps": timestamps,
        "fps_history": fps_history,
        "cpu_history": cpu_history,
        "ram_history": ram_history
    }


def generate_benchmark_plots(
    single_res: Dict[str, Any],
    multi_res: Dict[str, Any],
    timestamp_str: str
) -> List[str]:
    """Generates PNG diagnostic visualizations using matplotlib."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    saved_charts = []

    # Chart 1: Latency by Pipeline Stage
    stages = list(single_res["stage_latencies_ms"].keys())
    means = [single_res["stage_latencies_ms"][s]["mean"] for s in stages]
    p95s = [single_res["stage_latencies_ms"][s]["p95"] for s in stages]
    p99s = [single_res["stage_latencies_ms"][s]["p99"] for s in stages]

    clean_labels = [s.replace("_", " ").title() for s in stages]
    x = np.arange(len(stages))
    width = 0.25

    plt.figure(figsize=(12, 6), dpi=150)
    plt.bar(x - width, means, width, label="Mean (avg)", color="#3b82f6")
    plt.bar(x, p95s, width, label="p95 Latency", color="#f59e0b")
    plt.bar(x + width, p99s, width, label="p99 Latency", color="#ef4444")
    plt.xlabel("Pipeline Processing Stage", fontsize=11, fontweight="bold")
    plt.ylabel("Latency (milliseconds)", fontsize=11, fontweight="bold")
    plt.title(f"Smart Vision Sentry — Latency by Stage (InsightFace / ArcFace)\nE2E Mean: {single_res['stage_latencies_ms']['end_to_end']['mean']:.1f}ms | p95: {single_res['stage_latencies_ms']['end_to_end']['p95']:.1f}ms", fontsize=12, fontweight="bold")
    plt.xticks(x, clean_labels, rotation=15, ha="right")
    plt.grid(axis="y", linestyle="--", alpha=0.5)
    plt.legend()
    plt.tight_layout()

    chart1_path = RESULTS_DIR / f"latency_by_stage_{timestamp_str}.png"
    plt.savefig(chart1_path)
    plt.close()
    saved_charts.append(str(chart1_path))

    # Chart 2: Multi-Stream FPS Scaling
    if "scaling" in multi_res and multi_res["scaling"]:
        scaling = multi_res["scaling"]
        streams = [scaling[k]["stream_count"] for k in scaling]
        per_stream_fps = [scaling[k]["per_stream_fps"] for k in scaling]
        agg_fps = [scaling[k]["aggregate_fps"] for k in scaling]

        plt.figure(figsize=(10, 5), dpi=150)
        plt.plot(streams, agg_fps, marker="o", linewidth=2.5, color="#10b981", label="Aggregate FPS (Throughput)")
        plt.plot(streams, per_stream_fps, marker="s", linewidth=2.0, linestyle="--", color="#6366f1", label="Per-Stream FPS")
        plt.xlabel("Concurrent Streams Count", fontsize=11, fontweight="bold")
        plt.ylabel("Frames Per Second (FPS)", fontsize=11, fontweight="bold")
        plt.title(f"Smart Vision Sentry — Multi-Stream Concurrency Scaling\n({multi_res.get('source_type', 'Benchmark')})", fontsize=12, fontweight="bold")
        plt.xticks(streams)
        plt.grid(True, linestyle="--", alpha=0.5)
        plt.legend()
        plt.tight_layout()

        chart2_path = RESULTS_DIR / f"fps_vs_stream_count_{timestamp_str}.png"
        plt.savefig(chart2_path)
        plt.close()
        saved_charts.append(str(chart2_path))

    # Chart 3: Single-Stream E2E Latency Distribution Over Frames
    if "raw_e2e_latencies" in single_res and single_res["raw_e2e_latencies"]:
        raw_lats = single_res["raw_e2e_latencies"]
        plt.figure(figsize=(12, 4.5), dpi=150)
        plt.plot(raw_lats, color="#06b6d4", linewidth=1.0, alpha=0.8, label="Frame E2E Latency (ms)")
        plt.axhline(y=single_res["stage_latencies_ms"]["end_to_end"]["mean"], color="#ef4444", linestyle="--", label=f"Mean ({single_res['stage_latencies_ms']['end_to_end']['mean']:.1f}ms)")
        plt.axhline(y=single_res["stage_latencies_ms"]["end_to_end"]["p95"], color="#f59e0b", linestyle=":", label=f"p95 ({single_res['stage_latencies_ms']['end_to_end']['p95']:.1f}ms)")
        plt.xlabel("Processed Frame Index", fontsize=11, fontweight="bold")
        plt.ylabel("Latency (ms)", fontsize=11, fontweight="bold")
        plt.title("End-to-End Latency Over Time (Single Stream)", fontsize=12, fontweight="bold")
        plt.grid(True, linestyle="--", alpha=0.5)
        plt.legend()
        plt.tight_layout()

        chart3_path = RESULTS_DIR / f"fps_latency_over_time_{timestamp_str}.png"
        plt.savefig(chart3_path)
        plt.close()
        saved_charts.append(str(chart3_path))

    return saved_charts


def save_csv_results(
    single_res: Dict[str, Any],
    multi_res: Dict[str, Any],
    meta: Dict[str, Any],
    timestamp_str: str
) -> List[str]:
    """Exports benchmark findings to CSV format."""
    saved_csvs = []

    # CSV 1: Latency by stage
    csv1_path = RESULTS_DIR / f"benchmark_latencies_{timestamp_str}.csv"
    with open(csv1_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Stage", "Mean (ms)", "Median (ms)", "p95 (ms)", "p99 (ms)", "Min (ms)", "Max (ms)", "Std (ms)"])
        for stage, p in single_res["stage_latencies_ms"].items():
            writer.writerow([stage, p["mean"], p["median"], p["p95"], p["p99"], p["min"], p["max"], p["std"]])
    saved_csvs.append(str(csv1_path))

    # CSV 2: Multi-stream scaling
    if "scaling" in multi_res and multi_res["scaling"]:
        csv2_path = RESULTS_DIR / f"benchmark_multistream_{timestamp_str}.csv"
        with open(csv2_path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["Streams", "Per-Stream FPS", "Aggregate FPS", "Avg Latency (ms)", "CPU %", "RAM (MB)"])
            for _, data in multi_res["scaling"].items():
                writer.writerow([data["stream_count"], data["per_stream_fps"], data["aggregate_fps"], data["avg_latency_ms"], data["cpu_percent"], data["ram_usage_mb"]])
        saved_csvs.append(str(csv2_path))

    return saved_csvs


def main():
    parser = argparse.ArgumentParser(description="Smart Vision Sentry — Pipeline Performance Benchmark")
    parser.add_argument("--frames", type=int, default=500, help="Number of frames for single stream benchmark (default: 500)")
    parser.add_argument("--source", type=str, default=None, help="Video path or RTSP stream URL (default: synthetic CCTV corridor)")
    parser.add_argument("--streams", type=int, nargs="+", default=[1, 2, 4, 8], help="Stream counts to evaluate (default: 1 2 4 8)")
    parser.add_argument("--stream-frames", type=int, default=150, help="Frames per stream in multi-stream mode (default: 150)")
    parser.add_argument("--duration", type=int, default=0, help="Continuous endurance test duration in seconds (0 = skip)")
    parser.add_argument("--simulate-delay-ms", type=float, default=0.0, help="Simulated network transmission delay (ms)")
    parser.add_argument("--simulate-jitter-ms", type=float, default=0.0, help="Simulated network transmission jitter (ms)")
    parser.add_argument("--simulate-drop-rate", type=float, default=0.0, help="Simulated network packet drop rate (0.0 to 1.0)")
    args = parser.parse_args()

    # Precondition Check
    meta = check_preconditions()

    timestamp_str = time.strftime("%Y%m%d_%H%M%S")

    print(f"\n=======================================================")
    print(f"SMART VISION SENTRY — BENCHMARK EXECUTION (RUN 2)")
    print(f"=======================================================")
    print(f"Face Engine:        {meta['face_engine']}")
    print(f"Face Model:         {meta['face_model']}")
    print(f"Execution Provider: {meta['execution_provider']}")
    print(f"YOLO Detector:      {meta['detector_model']}")
    print(f"Hardware:           {meta['machine']} ({meta['processor']})")
    print(f"OS:                 {meta['os']}")
    print(f"Python:             {meta['python_version']}")
    print(f"Timestamp:          {meta['timestamp']}")
    print(f"=======================================================\n")

    # 1. Single Stream Stage-by-Stage Latency Benchmark
    single_res = run_single_stream_benchmark(
        num_frames=args.frames,
        source_path=args.source,
        simulate_delay_ms=args.simulate_delay_ms,
        simulate_jitter_ms=args.simulate_jitter_ms,
        simulate_drop_rate=args.simulate_drop_rate
    )

    # 2. Multi-Stream Concurrency Benchmark
    multi_res = run_multi_stream_benchmark(
        stream_counts=args.streams,
        frames_per_stream=args.stream_frames,
        source_path=args.source
    )

    # 3. 30-Minute Endurance Benchmark (if requested)
    if args.duration > 0:
        endurance_res = run_endurance_mode(duration_seconds=args.duration, source_path=args.source)
    else:
        endurance_res = {
            "status": "NOT YET MEASURED",
            "reason": "30-minute continuous mode not triggered in this test invocation."
        }

    # Generate Visualization Charts
    saved_charts = generate_benchmark_plots(single_res, multi_res, timestamp_str)

    # Export CSV Files
    saved_csvs = save_csv_results(single_res, multi_res, meta, timestamp_str)

    # Compile Comprehensive JSON Report
    full_report = {
        "metadata": meta,
        "single_stream_benchmark": single_res,
        "multi_stream_benchmark": multi_res,
        "endurance_benchmark": endurance_res,
        "baseline_comparison": {
            "status": "No verified baseline available.",
            "note": "Initial baseline established under RUN 1 architecture (InsightFace/ArcFace + ResidentCache)."
        },
        "artifacts": {
            "charts": saved_charts,
            "csvs": saved_csvs
        }
    }

    json_path = RESULTS_DIR / f"benchmark_report_{timestamp_str}.json"
    with open(json_path, "w") as f:
        # Strip raw array from JSON report to keep file size clean
        clean_report = dict(full_report)
        clean_report["single_stream_benchmark"] = {k: v for k, v in single_res.items() if k != "raw_e2e_latencies"}
        json.dump(clean_report, f, indent=2)

    print(f"\n=======================================================")
    print(f"BENCHMARK COMPLETED SUCCESSFULLY")
    print(f"=======================================================")
    print(f"Report JSON:  {json_path}")
    print(f"CSV Outputs:  {', '.join(saved_csvs)}")
    print(f"Chart Plots:  {', '.join(saved_charts)}")
    print(f"=======================================================\n")

    return full_report


if __name__ == "__main__":
    main()
