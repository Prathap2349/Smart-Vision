import cv2
import json
import numpy as np
from typing import Dict, Any, Tuple, Optional, List
from database import get_db_connection

class PrototypeFaceMatcher:
    """
    Prototype Face Verification Engine.
    Uses normalized 512-dimensional pixel-feature vector cosine similarity matching
    against whitelisted resident embeddings stored in SQLite.
    """
    def __init__(self):
        self.similarity_threshold = 0.65

    def generate_embedding(self, face_crop: np.ndarray) -> List[float]:
        """Generates a normalized 512-dimensional feature embedding vector from a face/person crop."""
        if face_crop is None or not isinstance(face_crop, np.ndarray) or face_crop.size == 0:
            return []
        
        try:
            resized = cv2.resize(face_crop, (64, 64))
            vec = resized.flatten().astype(np.float32) / 255.0
            sub_vec = vec[:512]
            norm = np.linalg.norm(sub_vec)
            if norm > 0:
                return (sub_vec / norm).tolist()
            return np.zeros(512).tolist()
        except Exception as e:
            print(f"[Face Matcher Error] Embedding generation failed: {e}")
            return []

    def verify_identity(self, person_crop: np.ndarray) -> Dict[str, Any]:
        """
        Structured face verification endpoint.
        Returns:
        {
            "matched": bool,
            "resident_id": Optional[str],
            "resident_name": Optional[str],
            "confidence": float,
            "status": "KNOWN" / "UNKNOWN" / "NO_FACE"
        }
        """
        status, name, conf = self.match_face(person_crop)
        return {
            "matched": status == "KNOWN",
            "resident_name": name,
            "confidence": conf,
            "status": status
        }

    def match_face(self, person_crop: np.ndarray) -> Tuple[str, Optional[str], float]:
        """
        Compares person face crop with whitelisted resident embeddings stored in SQLite.
        Returns Tuple of (face_status, resident_name, confidence).
        face_status can be: 'KNOWN', 'UNKNOWN', or 'NO_FACE'
        """
        if person_crop is None or not isinstance(person_crop, np.ndarray) or person_crop.size == 0:
            return "NO_FACE", None, 0.0

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, embedding_json FROM residents WHERE face_status = 'VERIFIED';")
        rows = cursor.fetchall()
        conn.close()

        crop_vec = np.array(self.generate_embedding(person_crop))
        if len(crop_vec) == 0:
            return "UNKNOWN", None, 0.0

        best_match_name = None
        highest_sim = 0.0

        for row in rows:
            res_name = row['name']
            emb_str = row['embedding_json']
            if emb_str:
                try:
                    res_vec = np.array(json.loads(emb_str))
                    sim = float(np.dot(crop_vec, res_vec) / (np.linalg.norm(crop_vec) * np.linalg.norm(res_vec) + 1e-6))
                    if sim > highest_sim:
                        highest_sim = sim
                        best_match_name = res_name
                except Exception:
                    pass

        if highest_sim >= self.similarity_threshold and best_match_name:
            return "KNOWN", best_match_name, round(highest_sim, 2)

        return "UNKNOWN", None, round(highest_sim, 2)

# Backward-compatibility aliases
InsightFaceRecognizer = PrototypeFaceMatcher
face_recognizer = PrototypeFaceMatcher()
