import json
import logging
import sqlite3
import threading
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
from database import get_db_connection

logger = logging.getLogger("ResidentCache")

def is_legacy_embedding(emb_obj: Any) -> bool:
    """
    Detects if an embedding JSON represents a legacy prototype raw-pixel embedding.
    Legacy format:
    - Raw list of 512 floats without schema metadata
    - Missing 'version': 'arcface_v1' header
    - Empty or non-dict structure
    """
    if emb_obj is None:
        return False
    if isinstance(emb_obj, str):
        try:
            emb_obj = json.loads(emb_obj)
        except Exception:
            return True
    
    if isinstance(emb_obj, list):
        # Old format was a single flat list of 512 numbers
        return True
    
    if isinstance(emb_obj, dict):
        if emb_obj.get("version") != "arcface_v1":
            return True
        embeddings = emb_obj.get("embeddings")
        if not isinstance(embeddings, list) or len(embeddings) == 0:
            return True
        return False
    
    return True

class ResidentCache:
    """
    High-Performance In-Memory Resident Embedding Cache.
    Prevents per-frame SQLite database disk I/O by caching whitelisted resident
    ArcFace embeddings in RAM.
    
    Supports:
    - Multiple ArcFace embeddings per resident (3-5 enrollment photos)
    - Vectorized cosine similarity computation across all resident photos
    - Automatic migration of legacy raw-pixel prototype embeddings to RE_ENROLLMENT_REQUIRED
    - Thread-safe reload / invalidation
    """
    def __init__(self):
        self._lock = threading.RLock()
        # Structure: resident_id -> {
        #   "id": str,
        #   "name": str,
        #   "resident_code": str,
        #   "role": str,
        #   "face_status": str,
        #   "embeddings": np.ndarray of shape (N, 512) normalized
        # }
        self._residents: Dict[str, Dict[str, Any]] = {}
        self._legacy_count: int = 0
        self._last_loaded: float = 0.0
        self.reload()

    @property
    def legacy_count(self) -> int:
        with self._lock:
            return self._legacy_count

    def __len__(self) -> int:
        with self._lock:
            return len(self._residents)

    def scan_and_migrate_legacy_embeddings(self) -> int:
        """
        Scans SQLite database for legacy raw-pixel embeddings.
        Marks them as RE_ENROLLMENT_REQUIRED while preserving the resident identity record.
        """
        migrated_count = 0
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, face_status, embedding_json FROM residents;")
            rows = cursor.fetchall()
            
            for row in rows:
                r_id = row["id"]
                r_name = row["name"]
                status = row["face_status"]
                emb_str = row["embedding_json"]
                
                if emb_str and status == "VERIFIED":
                    try:
                        emb_data = json.loads(emb_str)
                        if is_legacy_embedding(emb_data):
                            logger.warning(
                                f"[ResidentCache Migration] Resident '{r_name}' ({r_id}) has legacy raw-pixel embedding. "
                                f"Updating face_status to 'RE_ENROLLMENT_REQUIRED'."
                            )
                            cursor.execute(
                                "UPDATE residents SET face_status = 'RE_ENROLLMENT_REQUIRED' WHERE id = ?;",
                                (r_id,)
                            )
                            migrated_count += 1
                    except Exception as parse_err:
                        logger.error(f"[ResidentCache Migration Error] Failed parsing embedding for {r_name}: {parse_err}")
                        cursor.execute(
                            "UPDATE residents SET face_status = 'RE_ENROLLMENT_REQUIRED' WHERE id = ?;",
                            (r_id,)
                        )
                        migrated_count += 1
            
            if migrated_count > 0:
                conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"[ResidentCache Migration Warning] Failed checking legacy embeddings: {e}")
            
        return migrated_count

    def reload(self):
        """Reloads all active VERIFIED residents and their ArcFace embeddings into memory."""
        with self._lock:
            # First detect & migrate legacy embeddings if any
            self.scan_and_migrate_legacy_embeddings()
            
            new_residents: Dict[str, Dict[str, Any]] = {}
            legacy_found = 0
            
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, name, resident_id, role, face_status, avatar_url, embedding_json 
                    FROM residents;
                """)
                rows = cursor.fetchall()
                conn.close()
                
                for row in rows:
                    r_id = row["id"]
                    r_name = row["name"]
                    r_code = row["resident_id"]
                    r_role = row["role"]
                    status = row["face_status"]
                    emb_str = row["embedding_json"]
                    
                    if status == "RE_ENROLLMENT_REQUIRED":
                        legacy_found += 1
                        continue
                        
                    if status == "VERIFIED" and emb_str:
                        try:
                            emb_data = json.loads(emb_str)
                            if isinstance(emb_data, dict) and emb_data.get("version") == "arcface_v1":
                                vectors = emb_data.get("embeddings", [])
                                if vectors:
                                    mat = np.array(vectors, dtype=np.float32)
                                    # Normalize each embedding row
                                    norms = np.linalg.norm(mat, axis=1, keepdims=True)
                                    norms[norms == 0] = 1e-6
                                    normalized_mat = mat / norms
                                    
                                    new_residents[r_id] = {
                                        "id": r_id,
                                        "name": r_name,
                                        "resident_code": r_code,
                                        "role": r_role,
                                        "face_status": status,
                                        "avatar_url": row["avatar_url"],
                                        "embeddings": normalized_mat
                                    }
                            elif is_legacy_embedding(emb_data):
                                legacy_found += 1
                        except Exception as e:
                            logger.error(f"[ResidentCache] Error loading embeddings for {r_name}: {e}")
                
                self._residents = new_residents
                self._legacy_count = legacy_found
                import time
                self._last_loaded = time.time()
                logger.info(f"[ResidentCache] Loaded {len(self._residents)} verified residents into memory ({legacy_found} legacy requiring re-enrollment).")
            except Exception as e:
                logger.error(f"[ResidentCache Error] Failed reloading residents from SQLite: {e}")

    def invalidate(self):
        """Explicitly invalidate and reload the in-memory cache."""
        self.reload()

    def get_verified_residents(self) -> List[Dict[str, Any]]:
        """Returns list of all active verified resident dictionaries."""
        with self._lock:
            return list(self._residents.values())

    def match(self, query_embedding: np.ndarray, similarity_threshold: float = 0.50) -> Tuple[str, Optional[str], Optional[str], float]:
        """
        Fast in-memory vectorized cosine similarity comparison.
        Compares query_embedding (512-D) against all stored photos of all whitelisted residents.
        
        Returns:
            (status: "KNOWN" | "UNKNOWN", resident_name: Optional[str], resident_id: Optional[str], confidence: float)
        """
        if query_embedding is None or len(query_embedding) == 0:
            return "UNKNOWN", None, None, 0.0

        q_vec = np.array(query_embedding, dtype=np.float32).flatten()
        q_norm = np.linalg.norm(q_vec)
        if q_norm == 0:
            return "UNKNOWN", None, None, 0.0
        q_vec = q_vec / q_norm

        best_sim = 0.0
        best_name = None
        best_id = None

        with self._lock:
            for r_id, res_data in self._residents.items():
                res_mat = res_data["embeddings"] # shape (N, 512)
                # Compute dot products with all embeddings of this resident
                sims = np.dot(res_mat, q_vec)
                max_res_sim = float(np.max(sims))
                
                if max_res_sim > best_sim:
                    best_sim = max_res_sim
                    best_name = res_data["name"]
                    best_id = r_id

        if best_sim >= similarity_threshold and best_name is not None:
            return "KNOWN", best_name, best_id, round(best_sim, 3)

        return "UNKNOWN", None, None, round(best_sim, 3)

# Global singleton in-memory resident cache instance
resident_cache = ResidentCache()
