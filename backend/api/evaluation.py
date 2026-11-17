import glob
import json
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import APIRouter
from face.recognizer import face_recognizer

router = APIRouter(prefix="/api/evaluation", tags=["evaluation"])

EVAL_RESULTS_DIR = Path(__file__).resolve().parent.parent.parent / "evaluation" / "results"
EVAL_DATASET_DIR = Path(__file__).resolve().parent.parent.parent / "evaluation" / "dataset"
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

    from evaluation.dataset_validator import validate_dataset
    try:
        inventory = validate_dataset(EVAL_DATASET_DIR)
    except (OSError, ValueError) as exc:
        inventory = {"status": "INVALID_DATASET", "clip_inventory": [], "missing_files": [], "extra_files": [], "unlabelled_clips": [], "clips_on_disk_count": 0}
        inventory_error = str(exc)
    else:
        inventory_error = None
    # Never serve old metrics after clips have been removed or the data is incomplete.
    if (inventory.get("clips_on_disk_count", 0) == 0
            or inventory.get("extra_files")
            or inventory.get("invalid_rows")):
        return {
            "has_evaluation_results": False,
            "status": "INSUFFICIENT_DATASET",
            "message": "Real, labelled evaluation clips are required before accuracy metrics can be reported.",
            "inventory": inventory,
            "inventory_error": inventory_error,
            "sample_size": 0,
            "metrics": None,
            "engine": engine_name,
            "model": model_name,
            "execution_provider": provider_name,
            "timestamp": None,
            "benchmark": bench_data,
        }

    eval_json_path = EVAL_RESULTS_DIR / "results.json"

    # Case 1: Real-world evaluation results file exists
    if eval_json_path.exists():
        try:
            with open(eval_json_path, "r") as f:
                eval_data = json.load(f)

            test_m = eval_data.get("held_out_test_metrics", {})
            split = eval_data.get("dataset_split", {})
            meta = eval_data.get("metadata", {})

            return {
                "has_evaluation_results": eval_data.get("status") == "COMPLETED",
                "status": eval_data.get("status", "INSUFFICIENT_DATASET"),
                "metrics": test_m if eval_data.get("status") == "COMPLETED" else None,
                "sample_size": eval_data.get("sample_sizes", {}).get("held_out_clips", 0),
                "warning": eval_data.get("warning"),
                "threshold": split.get("selected_frozen_threshold", 0.50),
                "dataset_size": eval_data.get("sample_sizes", {}).get("labelled_clips_on_disk", 0),
                "tuning_test_split": f"{split.get('tuning_set_count', 0)} tuning / {split.get('held_out_test_count', 0)} held-out test",
                "engine": meta.get("face_engine", engine_name),
                "model": meta.get("face_model", model_name),
                "execution_provider": meta.get("execution_provider", provider_name),
                "timestamp": meta.get("timestamp"),
                "benchmark": bench_data
            }
        except Exception as e:
            print(f"[Evaluation API Warning] Failed to parse results.json: {e}")

    # A missing report never turns inventory into fabricated zero-valued metrics.
    return {
        "has_evaluation_results": False,
        "status": "INSUFFICIENT_DATASET",
        "message": "Real evaluation clips are present, but no completed evaluation report is available.",
        "inventory": inventory,
        "metrics": None,
        "sample_size": 0,
        "threshold": getattr(face_recognizer, "similarity_threshold", 0.50),
        "dataset_size": inventory.get("clips_on_disk_count", 0),
        "tuning_test_split": "0 tuning / 0 held-out test",
        "engine": engine_name,
        "model": model_name,
        "execution_provider": provider_name,
        "timestamp": None,
        "benchmark": bench_data
    }
