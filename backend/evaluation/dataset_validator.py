"""Validate real evaluation clips against labels.csv without opening video content."""
import csv
from pathlib import Path

VIDEO_SUFFIXES = {".mp4", ".avi", ".mov", ".mkv", ".m4v"}


def validate_dataset(dataset_dir: Path) -> dict:
    labels_path = dataset_dir / "labels.csv"
    if not labels_path.is_file():
        raise FileNotFoundError(f"Missing labels file: {labels_path}")
    with labels_path.open(newline="", encoding="utf-8") as source:
        reader = csv.DictReader(source)
        required = {"video", "scenario", "expected_alert", "resident_present", "notes"}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError(f"labels.csv must include columns: {', '.join(sorted(required))}")
        rows = list(reader)

    labels = {}
    invalid_rows = []
    for line, row in enumerate(rows, start=2):
        rel = (row.get("video") or "").strip()
        path = Path(rel)
        if not rel or path.is_absolute() or ".." in path.parts:
            invalid_rows.append({"line": line, "video": rel, "reason": "invalid relative video path"})
            continue
        if rel in labels:
            invalid_rows.append({"line": line, "video": rel, "reason": "duplicate label"})
        labels[rel] = row
        try:
            if row["expected_alert"].strip() not in {"0", "1"} or row["resident_present"].strip() not in {"0", "1"}:
                raise ValueError
        except (KeyError, ValueError):
            invalid_rows.append({"line": line, "video": rel, "reason": "binary labels must be 0 or 1"})

    clips = sorted(p for p in dataset_dir.rglob("*") if p.is_file() and p.suffix.lower() in VIDEO_SUFFIXES)
    disk_rel = {p.relative_to(dataset_dir).as_posix() for p in clips}
    labelled = set(labels)
    return {
        "status": "VALID" if not invalid_rows and not (labelled - disk_rel) and not (disk_rel - labelled) else "INVALID_DATASET",
        "clip_inventory": [{"video": p, "labelled": p in labelled} for p in sorted(disk_rel | labelled)],
        "missing_files": sorted(labelled - disk_rel),
        "extra_files": sorted(disk_rel - labelled),
        "unlabelled_clips": sorted(disk_rel - labelled),
        "invalid_rows": invalid_rows,
        "labelled_clip_count": len(labelled),
        "clips_on_disk_count": len(disk_rel),
    }
