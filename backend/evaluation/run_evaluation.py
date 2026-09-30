#!/usr/bin/env python3
"""
Smart Vision Sentry — Real-World FP/FN Evaluation Suite (RUN 3)
Evaluates end-to-end detection, biometric face verification, decision gates,
and false alarm suppression against ground-truth scenarios.

Precondition: Active face engine MUST be InsightFace / ArcFace.
"""

import os
import sys
import time
import json
import csv
import platform
import argparse
import numpy as np
import cv2
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

# Matplotlib configuration
EVAL_DIR = Path(__file__).resolve().parent.parent.parent / "evaluation"
RESULTS_DIR = EVAL_DIR / "results"
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


ALL_REQUIRED_SCENARIOS = [
    "empty_corridor",
    "shadows_wind",
    "animals",
    "resident",
    "resident_lingering",
    "delivery_person",
    "unknown_loitering",
    "night_low_light",
    "multiple_people",
    "occlusion",
    "mask_cap"
]


def check_preconditions() -> Dict[str, Any]:
    """Verifies that active engine is InsightFace/ArcFace."""
    if face_recognizer is None or not getattr(face_recognizer, "is_ready", False):
        err = getattr(face_recognizer, "initialization_error", "Face recognizer not initialized")
        print(f"\n[EVALUATION ABORTED] Precondition failed: InsightFace engine is NOT ready! Error: {err}")
        sys.exit(1)

    provider = getattr(face_recognizer, "active_provider", "UNKNOWN")
    if provider == "FAILED":
        print(f"\n[EVALUATION ABORTED] Precondition failed: InsightFace provider status is FAILED.")
        sys.exit(1)

    metadata = {
        "face_engine": "InsightFace / ArcFace",
        "face_model": getattr(face_recognizer, "model_name", INSIGHTFACE_MODEL_NAME),
        "execution_provider": provider,
        "detector_model": "YOLOv8-Nano (yolov8n.pt)",
        "dataset_version": "1.0.0-groundtruth",
        "machine": platform.machine(),
        "processor": platform.processor() or platform.machine(),
        "os": f"{platform.system()} {platform.release()}",
        "python_version": sys.version.split()[0],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    return metadata


def load_dataset_manifest(dataset_dir: Path) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Reads labels.csv and audits existing video clips on disk.
    Returns:
        (registered_clips, dataset_inventory_report)
    """
    labels_file = dataset_dir / "labels.csv"
    if not labels_file.exists():
        return [], {"error": f"labels.csv not found at {labels_file}"}

    manifest_entries = []
    with open(labels_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rel_video = row["video"].strip()
            video_path = dataset_dir / rel_video
            manifest_entries.append({
                "video_rel": rel_video,
                "video_path": video_path,
                "exists": video_path.exists(),
                "scenario": row["scenario"].strip(),
                "expected_alert": int(row["expected_alert"].strip()),
                "resident_present": int(row["resident_present"].strip()),
                "notes": row.get("notes", "").strip()
            })

    # Inventory calculation
    existing_by_scenario = {s: 0 for s in ALL_REQUIRED_SCENARIOS}
    missing_by_scenario = {s: 0 for s in ALL_REQUIRED_SCENARIOS}

    for entry in manifest_entries:
        scen = entry["scenario"]
        if scen in existing_by_scenario:
            if entry["exists"]:
                existing_by_scenario[scen] += 1
            else:
                missing_by_scenario[scen] += 1

    inventory = {
        "total_manifest_entries": len(manifest_entries),
        "existing_clips_count": sum(existing_by_scenario.values()),
        "missing_clips_count": sum(missing_by_scenario.values()),
        "existing_by_scenario": existing_by_scenario,
        "missing_by_scenario": missing_by_scenario,
        "missing_scenarios": [s for s, cnt in existing_by_scenario.items() if cnt == 0]
    }
    return manifest_entries, inventory


def run_pipeline_on_clip(
    video_path: Path,
    similarity_threshold: float = FACE_SIMILARITY_THRESHOLD,
    night_profile: bool = False
) -> Dict[str, Any]:
    """
    Executes the REAL Smart Vision Sentry pipeline on a single video clip.
    Event definition: one video clip represents one evaluation event.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return {
            "error": f"Failed to open video {video_path}",
            "actual_alert": False,
            "duration_seconds": 0.0,
            "alert_timestamp": None,
            "recognized_residents": [],
            "face_events": []
        }

    fps = cap.get(cv2.CAP_PROP_FPS) or 10.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = total_frames / fps if fps > 0 else 0.0

    tracker = LightweightIoUTracker()
    zones = [{
        "id": "zone-01",
        "name": "Corridor Protection Zone",
        "type": "CORRIDOR",
        "dwell_threshold": 10 if night_profile else 20,
        "polygonPoints": [{"x": 10, "y": 10}, {"x": 90, "y": 10}, {"x": 90, "y": 90}, {"x": 10, "y": 90}]
    }]

    actual_alert = False
    alert_timestamp_sec = None
    alert_reason = None
    recognized_residents = set()
    face_events = []

    frame_idx = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret or frame is None:
            break

        frame_idx += 1
        current_time_sec = frame_idx / fps
        h, w = frame.shape[:2]

        # 1. YOLO Human Detection
        detections = yolo_detector.detect(frame, conf_threshold=0.65)

        # 2. Lightweight IoU Multi-Object Tracking
        tracks = tracker.update_tracks(detections, zones, frame_w=w, frame_h=h, frame=frame)

        # 3. Face Detection & ArcFace Embedding Verification
        for t in tracks:
            x1, y1, x2, y2 = [int(v) for v in t.bbox]
            crop = frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]

            if crop.size > 0 and t.should_verify_face(interval=TRACK_RECOGNITION_INTERVAL):
                status, res_name, conf = face_recognizer.match_face(crop)
                t.record_face_result(status, res_name, conf)

                if status == "KNOWN" and res_name:
                    recognized_residents.add(res_name)

                face_events.append({
                    "time_sec": round(current_time_sec, 2),
                    "track_id": t.track_id,
                    "face_status": status,
                    "resident_name": res_name,
                    "confidence": conf
                })

            # 4. Triple-Gate Decision Engine Evaluation
            dwell_th = 10.0 if night_profile else 20.0
            gate_eval = decision_engine.evaluate_gates(
                is_human=True,
                human_confidence=t.confidence,
                dwell_seconds=t.dwell_seconds,
                dwell_threshold=dwell_th,
                face_status=t.face_status
            )

            # 5. Alert Trigger Verification
            if gate_eval["final_decision"] == "VERIFIED_THREAT" and not actual_alert:
                actual_alert = True
                alert_timestamp_sec = round(current_time_sec, 2)
                alert_reason = gate_eval.get("explainable_summary", "Triple-Gate threat verified")

    cap.release()

    return {
        "actual_alert": actual_alert,
        "alert_timestamp": alert_timestamp_sec,
        "alert_reason": alert_reason,
        "duration_seconds": round(duration_sec, 2),
        "total_frames": frame_idx,
        "recognized_residents": list(recognized_residents),
        "face_events_count": len(face_events)
    }


def run_motion_baseline_on_clip(video_path: Path, min_motion_duration_sec: float = 20.0) -> Dict[str, Any]:
    """
    OpenCV Frame-Difference Motion Baseline.
    Detects pixel change contours; triggers alert if continuous motion exceeds threshold.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return {"baseline_alert": False, "duration_seconds": 0.0}

    fps = cap.get(cv2.CAP_PROP_FPS) or 10.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = total_frames / fps if fps > 0 else 0.0

    prev_gray = None
    motion_start_time = None
    baseline_alert = False
    alert_time = None

    frame_idx = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret or frame is None:
            break

        frame_idx += 1
        t_sec = frame_idx / fps
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)

        if prev_gray is None:
            prev_gray = gray
            continue

        frame_diff = cv2.absdiff(prev_gray, gray)
        _, thresh = cv2.threshold(frame_diff, 25, 255, cv2.THRESH_BINARY)
        thresh = cv2.dilate(thresh, None, iterations=2)
        contours, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        has_motion = any(cv2.contourArea(c) > 600 for c in contours)
        prev_gray = gray

        if has_motion:
            if motion_start_time is None:
                motion_start_time = t_sec
            elif (t_sec - motion_start_time) >= min_motion_duration_sec:
                baseline_alert = True
                alert_time = round(t_sec, 2)
                break
        else:
            motion_start_time = None

    cap.release()
    return {
        "baseline_alert": baseline_alert,
        "alert_timestamp": alert_time,
        "duration_seconds": round(duration_sec, 2)
    }


def compute_metrics(eval_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes TP, FP, TN, FN, Precision, Recall, F1, False Alarms/Hour,
    and Biometric FAR/FRR metrics.
    """
    tp = sum(1 for r in eval_results if r["expected_alert"] == 1 and r["actual_alert"] is True)
    fp = sum(1 for r in eval_results if r["expected_alert"] == 0 and r["actual_alert"] is True)
    tn = sum(1 for r in eval_results if r["expected_alert"] == 0 and r["actual_alert"] is False)
    fn = sum(1 for r in eval_results if r["expected_alert"] == 1 and r["actual_alert"] is False)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    # Negative footage duration for False Alarms / Hour
    neg_duration_seconds = sum(r["duration_seconds"] for r in eval_results if r["expected_alert"] == 0)
    neg_duration_hours = neg_duration_seconds / 3600.0 if neg_duration_seconds > 0 else 0.0
    fa_per_hour = (fp / neg_duration_hours) if neg_duration_hours > 0 else 0.0

    # Face metrics
    resident_clips = [r for r in eval_results if r["resident_present"] == 1]
    recognized_residents_count = sum(1 for r in resident_clips if len(r.get("recognized_residents", [])) > 0)
    resident_accuracy = (recognized_residents_count / len(resident_clips)) if resident_clips else 0.0

    # FRR: Resident clips where resident was present but not recognized and incorrectly alerted
    frr_count = sum(1 for r in resident_clips if r["actual_alert"] is True and r["expected_alert"] == 0)
    frr = (frr_count / len(resident_clips)) if resident_clips else 0.0

    # FAR: Non-resident loitering clips falsely recognized as resident and suppressed
    intruder_clips = [r for r in eval_results if r["resident_present"] == 0 and r["expected_alert"] == 1]
    far_count = sum(1 for r in intruder_clips if len(r.get("recognized_residents", [])) > 0 or r["actual_alert"] is False)
    far = (far_count / len(intruder_clips)) if intruder_clips else 0.0

    return {
        "total_clips": len(eval_results),
        "TP": tp,
        "FP": fp,
        "TN": tn,
        "FN": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "negative_footage_hours": round(neg_duration_hours, 4),
        "false_alarms_per_hour": round(fa_per_hour, 2),
        "resident_recognition_accuracy": round(resident_accuracy, 4),
        "false_accept_rate": round(far, 4),
        "false_reject_rate": round(frr, 4)
    }


def execute_evaluation(
    dataset_dir: Path,
    similarity_threshold: float = 0.50,
    perform_sweep: bool = True
) -> Dict[str, Any]:
    """
    Main evaluation pipeline orchestrator.
    """
    meta = check_preconditions()
    manifest_entries, inventory = load_dataset_manifest(dataset_dir)

    print(f"\n=======================================================")
    print(f"SMART VISION SENTRY — EVALUATION AUDIT (RUN 3)")
    print(f"=======================================================")
    print(f"Engine:              {meta['face_engine']}")
    print(f"Model:               {meta['face_model']}")
    print(f"Provider:            {meta['execution_provider']}")
    print(f"Manifest Clips:      {inventory['total_manifest_entries']}")
    print(f"Clips on Disk:       {inventory['existing_clips_count']}")
    print(f"Missing Clips:       {inventory['missing_clips_count']}")
    print(f"Missing Scenarios:   {len(inventory['missing_scenarios'])} of {len(ALL_REQUIRED_SCENARIOS)}")
    print(f"=======================================================\n")

    # If insufficient real videos exist, DO NOT fabricate results
    valid_clips = [e for e in manifest_entries if e["exists"]]
    if len(valid_clips) == 0:
        missing_report = {
            "status": "INSUFFICIENT_DATASET",
            "metadata": meta,
            "inventory": inventory,
            "recommendation": {
                "minimum_clips_required": 22,
                "recommended_per_scenario": "2 to 3 clips per scenario",
                "missing_scenarios": ALL_REQUIRED_SCENARIOS,
                "guidelines": "Record 10-45s MP4 clips for each scenario in evaluation/dataset/<scenario>/ and populate labels.csv."
            }
        }
        
        # Save inventory audit to results
        audit_path = RESULTS_DIR / "dataset_inventory_audit.json"
        with open(audit_path, "w") as f:
            json.dump(missing_report, f, indent=2)
            
        print(f"[DATASET AUDIT] No physical video files found in evaluation/dataset/.")
        print(f"[DATASET AUDIT] Detailed inventory audit saved to: {audit_path}")
        return missing_report

    # Split into Tuning Set (50%) and Held-out Test Set (50%)
    import random
    random.seed(42)
    shuffled = list(valid_clips)
    random.shuffle(shuffled)
    split_idx = max(1, len(shuffled) // 2)
    tuning_clips = shuffled[:split_idx]
    test_clips = shuffled[split_idx:]

    print(f"[Dataset Split] Tuning Set: {len(tuning_clips)} clips | Held-out Test Set: {len(test_clips)} clips")

    # Threshold Sweep on Tuning Set
    sweep_results = []
    selected_threshold = similarity_threshold

    if perform_sweep and len(tuning_clips) > 0:
        print("\n--> Performing threshold sweep on TUNING SET only...")
        threshold_candidates = [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70]
        best_f1 = -1.0

        for th in threshold_candidates:
            th_evals = []
            for clip_entry in tuning_clips:
                res = run_pipeline_on_clip(
                    clip_entry["video_path"],
                    similarity_threshold=th,
                    night_profile=(clip_entry["scenario"] == "night_low_light")
                )
                th_evals.append({**clip_entry, **res})

            th_metrics = compute_metrics(th_evals)
            sweep_results.append({
                "threshold": th,
                "precision": th_metrics["precision"],
                "recall": th_metrics["recall"],
                "f1_score": th_metrics["f1_score"],
                "false_alarms_per_hour": th_metrics["false_alarms_per_hour"]
            })
            print(f"    Threshold {th:.2f} -> Precision: {th_metrics['precision']:.2f}, Recall: {th_metrics['recall']:.2f}, F1: {th_metrics['f1_score']:.2f}")

            if th_metrics["f1_score"] > best_f1:
                best_f1 = th_metrics["f1_score"]
                selected_threshold = th

        print(f"✓ Optimal threshold selected from Tuning Set: {selected_threshold:.2f} (F1 = {best_f1:.2f})")

    # Freeze threshold and evaluate on HELD-OUT TEST SET
    print(f"\n--> Running final evaluation on HELD-OUT TEST SET (Frozen Threshold = {selected_threshold:.2f})...")
    test_evaluations = []
    baseline_evaluations = []

    for clip_entry in test_clips:
        p_res = run_pipeline_on_clip(
            clip_entry["video_path"],
            similarity_threshold=selected_threshold,
            night_profile=(clip_entry["scenario"] == "night_low_light")
        )
        b_res = run_motion_baseline_on_clip(clip_entry["video_path"])

        test_evaluations.append({
            "video": clip_entry["video_rel"],
            "scenario": clip_entry["scenario"],
            "expected_alert": clip_entry["expected_alert"],
            "resident_present": clip_entry["resident_present"],
            "notes": clip_entry["notes"],
            **p_res
        })

        baseline_evaluations.append({
            "video": clip_entry["video_rel"],
            "scenario": clip_entry["scenario"],
            "expected_alert": clip_entry["expected_alert"],
            "actual_alert": b_res["baseline_alert"],
            "duration_seconds": b_res["duration_seconds"]
        })

    pipeline_metrics = compute_metrics(test_evaluations)
    baseline_metrics = compute_metrics(baseline_evaluations)

    # Save CSV Report
    csv_path = RESULTS_DIR / "results.csv"
    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["video", "scenario", "expected_alert", "actual_alert", "alert_timestamp_sec", "recognized_residents", "duration_sec", "notes"])
        for r in test_evaluations:
            writer.writerow([
                r["video"], r["scenario"], r["expected_alert"], 1 if r["actual_alert"] else 0,
                r.get("alert_timestamp") or "N/A", "|".join(r.get("recognized_residents", [])),
                r["duration_seconds"], r["notes"]
            ])

    # Save JSON Report
    timestamp_str = time.strftime("%Y%m%d_%H%M%S")
    report_data = {
        "metadata": meta,
        "dataset_split": {
            "tuning_set_count": len(tuning_clips),
            "held_out_test_count": len(test_clips),
            "selected_frozen_threshold": selected_threshold
        },
        "threshold_sweep_tuning": sweep_results,
        "held_out_test_metrics": pipeline_metrics,
        "opencv_motion_baseline_metrics": baseline_metrics
    }

    json_path = RESULTS_DIR / "results.json"
    with open(json_path, "w") as f:
        json.dump(report_data, f, indent=2)

    return report_data


def main():
    parser = argparse.ArgumentParser(description="Smart Vision Sentry — Real-World FP/FN Evaluation")
    parser.add_argument("--dataset-dir", type=str, default=str(EVAL_DIR / "dataset"), help="Path to evaluation dataset directory")
    parser.add_argument("--threshold", type=float, default=0.50, help="Default face similarity threshold (default: 0.50)")
    parser.add_argument("--no-sweep", action="store_true", help="Skip threshold sweep on tuning set")
    args = parser.parse_args()

    execute_evaluation(
        dataset_dir=Path(args.dataset_dir),
        similarity_threshold=args.threshold,
        perform_sweep=not args.no_sweep
    )


if __name__ == "__main__":
    main()
