#!/usr/bin/env python3
"""Enroll consenting residents' real photos from evaluation/dataset/enrollment."""
import argparse
import datetime
import json
import sys
import uuid
from pathlib import Path

import cv2

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from database import get_db_connection
from face.cache import resident_cache
from face.recognizer import face_recognizer

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def enroll(directory: Path) -> dict:
    if not face_recognizer or not getattr(face_recognizer, "is_ready", False):
        raise RuntimeError("InsightFace is not ready; install/load the configured model before enrollment.")
    resident_dirs = sorted(p for p in directory.iterdir() if p.is_dir()) if directory.exists() else []
    enrolled = []
    for resident_dir in resident_dirs:
        embeddings = []
        photos = sorted(p for p in resident_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES)
        if not photos:
            raise ValueError(f"No enrollment photos found for {resident_dir.name}")
        for photo in photos:
            image = cv2.imread(str(photo), cv2.IMREAD_COLOR)
            valid, embedding, reason = face_recognizer.validate_photo_for_enrollment(image)
            if not valid or embedding is None:
                raise ValueError(f"Rejected {photo.name} for {resident_dir.name}: {reason}")
            embeddings.append(embedding)

        resident_id = f"RES-{uuid.uuid4().hex[:4].upper()}"
        resident_key = f"res-{uuid.uuid4().hex[:6]}"
        payload = json.dumps({"version": "arcface_v1", "model": face_recognizer.model_name, "count": len(embeddings), "embeddings": embeddings})
        conn = get_db_connection()
        try:
            conn.execute(
                "INSERT INTO residents (id,name,resident_id,role,face_status,embedding_json,detection_count,added_date) VALUES (?,?,?,?,?,?,0,?)",
                (resident_key, resident_dir.name, resident_id, "Family Member", "VERIFIED", payload, datetime.date.today().isoformat()),
            )
            conn.commit()
        finally:
            conn.close()
        enrolled.append({"name": resident_dir.name, "photo_count": len(photos), "resident_id": resident_key})
    if enrolled:
        resident_cache.invalidate()
    return {"status": "ENROLLED", "residents": enrolled}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=Path("evaluation/dataset/enrollment"))
    args = parser.parse_args()
    print(json.dumps(enroll(args.directory), indent=2))
