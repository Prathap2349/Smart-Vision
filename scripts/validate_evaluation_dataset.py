#!/usr/bin/env python3
"""Print a JSON inventory and return nonzero if the real dataset is inconsistent."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from evaluation.dataset_validator import validate_dataset

if __name__ == "__main__":
    dataset = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("evaluation/dataset")
    report = validate_dataset(dataset)
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report["status"] == "VALID" else 1)
