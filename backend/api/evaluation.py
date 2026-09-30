import glob
import json
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import APIRouter
from face.recognizer import face_recognizer

router = APIRouter(prefix="/api/evaluation", tags=["evaluation"])

EVAL_RESULTS_DIR = Path(__file__).resolve().parent.parent.parent / "evaluation" / "results"
BENCHMARK_RESULTS_DIR = Path(__file__).resolve().parent.parent / "benchmarks" / "results"

def _get_latest_benchmark() -> Optional[Dict[str, Any]]:
    """Loads the most recent benchmark report JSON if present."""
    if not BENCHMARK_RESULTS_DIR.exists():
        return None
    bench_files = sorted(BENCHMARK_RESULTS_DIR.glob("benchmark_report_*.json"), reverse=True)
    if not bench_files:
        return None
    try:
        with open(bench_files[0], "r") as f:
            return json.load(f)
    except Exception:
        return None

@router.get("/latest")
def get_latest_evaluation() -> Dict[str, Any]:
    """
    Returns the latest verified real-world FP/FN evaluation results and benchmark telemetry.
    If no real-world evaluation dataset has been processed, returns a truthful empty state.
    """
    engine_name = "InsightFace / ArcFace"
    model_name = getattr(face_recognizer, "model_name", "buffalo_s")
    provider_name = getattr(face_recognizer, "active_provider", "UNKNOWN")

    bench_data = _get_latest_benchmark()

    eval_json_path = EVAL_RESULTS_DIR / "results.json"
    audit_json_path = EVAL_RESULTS_DIR / "dataset_inventory_audit.json"

    # Case 1: Real-world evaluation results file exists
    if eval_json_path.exists():
        try:
            with open(eval_json_path, "r") as f:
                eval_data = json.load(f)

            test_m = eval_data.get("held_out_test_metrics", {})
            split = eval_data.get("dataset_split", {})
            meta = eval_data.get("metadata", {})

            return {
                "has_evaluation_results": True,
                "status": "COMPLETED",
                "TP": test_m.get("TP", 0),
                "FP": test_m.get("FP", 0),
                "TN": test_m.get("TN", 0),
                "FN": test_m.get("FN", 0),
                "precision": test_m.get("precision", 0.0),
                "recall": test_m.get("recall", 0.0),
                "F1": test_m.get("f1_score", 0.0),
                "false_alarms_per_hour": test_m.get("false_alarms_per_hour", 0.0),
                "resident_recognition_accuracy": test_m.get("resident_recognition_accuracy", 0.0),
                "false_accept_rate": test_m.get("false_accept_rate", 0.0),
                "false_reject_rate": test_m.get("false_reject_rate", 0.0),
                "threshold": split.get("selected_frozen_threshold", 0.50),
                "dataset_size": split.get("tuning_set_count", 0) + split.get("held_out_test_count", 0),
                "tuning_test_split": f"{split.get('tuning_set_count', 0)} tuning / {split.get('held_out_test_count', 0)} held-out test",
                "engine": meta.get("face_engine", engine_name),
                "model": meta.get("face_model", model_name),
                "execution_provider": meta.get("execution_provider", provider_name),
                "timestamp": meta.get("timestamp"),
                "benchmark": bench_data
            }
        except Exception as e:
            print(f"[Evaluation API Warning] Failed to parse results.json: {e}")

    # Case 2: No physical clips recorded yet -> Return truthful empty/unmeasured state
    inventory_data = {}
    if audit_json_path.exists():
        try:
            with open(audit_json_path, "r") as f:
                audit_data = json.load(f)
                inventory_data = audit_data.get("inventory", {})
        except Exception:
            pass

    return {
        "has_evaluation_results": False,
        "status": "NO_EVALUATION_DATA",
        "message": "No evaluation results available. Real-world video clips are missing from evaluation/dataset/.",
        "TP": None,
        "FP": None,
        "TN": None,
        "FN": None,
        "precision": None,
        "recall": None,
        "F1": None,
        "false_alarms_per_hour": None,
        "resident_recognition_accuracy": None,
        "false_accept_rate": None,
        "false_reject_rate": None,
        "threshold": getattr(face_recognizer, "similarity_threshold", 0.50),
        "dataset_size": inventory_data.get("existing_clips_count", 0),
        "missing_clips_count": inventory_data.get("missing_clips_count", 20),
        "missing_scenarios": inventory_data.get("missing_scenarios", []),
        "tuning_test_split": "0 tuning / 0 held-out test",
        "engine": engine_name,
        "model": model_name,
        "execution_provider": provider_name,
        "timestamp": None,
        "benchmark": bench_data
    }
