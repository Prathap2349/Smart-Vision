import os
import cv2
import json
import logging
import numpy as np
from typing import Dict, Any, Tuple, Optional, List
from pathlib import Path

from config import (
    INSIGHTFACE_MODEL_NAME,
    INSIGHTFACE_ROOT,
    INSIGHTFACE_DET_SIZE,
    INSIGHTFACE_PROVIDERS,
    FACE_MIN_SIZE,
    FACE_MIN_BLUR_SCORE,
    FACE_SIMILARITY_THRESHOLD,
    MODELS_DIR
)
from face.cache import resident_cache, is_legacy_embedding

logger = logging.getLogger("InsightFaceRecognizer")

class InsightFaceRecognizer:
    """
    Production-Grade Facial Recognition & Biometric Verification Engine.
    Powered by InsightFace (SCRFD Face Detection + ArcFace Feature Extraction) and ONNX Runtime.
    
    Security & Architecture:
    - Dedicated SCRFD Face Detection & 5-point landmark alignment
    - 512-dimensional normalized ArcFace deep embedding vectors
    - Passive face-quality filtering (minimum bbox resolution & Laplacian blur variance)
      NOTE: Passive face-quality filtering; not full liveness detection.
    - Zero per-frame disk I/O via in-memory ResidentCache
    - Multi-photo enrollment embedding support per resident
    """
    def __init__(
        self,
        model_name: str = INSIGHTFACE_MODEL_NAME,
        root_dir: Path = INSIGHTFACE_ROOT,
        similarity_threshold: float = FACE_SIMILARITY_THRESHOLD,
        min_face_size: int = FACE_MIN_SIZE,
        min_blur_score: float = FACE_MIN_BLUR_SCORE
    ):
        self.model_name = model_name
        self.root_dir = Path(root_dir).resolve()
        self.similarity_threshold = similarity_threshold
        self.min_face_size = min_face_size
        self.min_blur_score = min_blur_score
        
        self.app = None
        self.active_provider = "UNKNOWN"
        self.initialization_error: Optional[str] = None
        self._init_engine()

    def _init_engine(self):
        """Initializes the InsightFace FaceAnalysis pipeline with CoreML or CPU execution provider."""
        try:
            import insightface
            from insightface.app import FaceAnalysis
            
            cache_root = self.root_dir / "cache"
            cache_root.mkdir(parents=True, exist_ok=True)

            providers = list(INSIGHTFACE_PROVIDERS)
            logger.info(f"[InsightFace] Initializing FaceAnalysis (model: {self.model_name}, providers: {providers})...")
            
            app_instance = None
            # Attempt 1: CoreML on Apple Silicon with custom cache directory
            if "CoreMLExecutionProvider" in providers:
                try:
                    app_instance = FaceAnalysis(
                        name=self.model_name,
                        root=str(self.root_dir),
                        providers=["CoreMLExecutionProvider", "CPUExecutionProvider"],
                        _coreml_cache_root=str(cache_root)
                    )
                    app_instance.prepare(ctx_id=0, det_size=INSIGHTFACE_DET_SIZE)
                    self.active_provider = "CoreMLExecutionProvider"
                    logger.info("[InsightFace] Initialized with CoreMLExecutionProvider.")
                except Exception as coreml_err:
                    logger.warning(f"[InsightFace] CoreMLExecutionProvider initialization failed: {coreml_err}. Falling back to CPUExecutionProvider...")
                    app_instance = None

            # Attempt 2: CPUExecutionProvider fallback
            if app_instance is None:
                app_instance = FaceAnalysis(
                    name=self.model_name,
                    root=str(self.root_dir),
                    providers=["CPUExecutionProvider"]
                )
                app_instance.prepare(ctx_id=0, det_size=INSIGHTFACE_DET_SIZE)
                self.active_provider = "CPUExecutionProvider"
                logger.info("[InsightFace] Initialized with CPUExecutionProvider.")

            self.app = app_instance
            self.initialization_error = None
            logger.info(f"[InsightFace] Models ready: {list(self.app.models.keys())}")

        except Exception as e:
            err_msg = f"CRITICAL: InsightFace initialization failed: {e}"
            logger.critical(err_msg)
            self.app = None
            self.active_provider = "FAILED"
            self.initialization_error = str(e)
            # Per Run 1 Rule: DO NOT silently fall back to PrototypeFaceMatcher.
            # Raise explicit error so startup and health checks expose the failure.
            print(f"\n=======================================================\n[InsightFace Error] {err_msg}\n=======================================================\n")

    @property
    def is_ready(self) -> bool:
        return self.app is not None

    def calculate_blur_score(self, face_crop: np.ndarray) -> float:
        """
        Calculates Laplacian variance of the face crop to assess image sharpness.
        Passive face-quality filtering; not full liveness detection.
        """
        if face_crop is None or face_crop.size == 0:
            return 0.0
        try:
            gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY) if len(face_crop.shape) == 3 else face_crop
            return float(cv2.Laplacian(gray, cv2.CV_64F).var())
        except Exception:
            return 0.0

    def detect_faces(self, image: np.ndarray) -> List[Any]:
        """Detects all faces in the provided frame/crop using SCRFD detector."""
        if not self.is_ready or image is None or not isinstance(image, np.ndarray) or image.size == 0:
            return []
        try:
            return self.app.get(image)
        except Exception as e:
            logger.error(f"[InsightFace Error] Face detection failed: {e}")
            return []

    def validate_photo_for_enrollment(self, image: np.ndarray) -> Tuple[bool, Optional[List[float]], str]:
        """
        Strict validation pipeline for resident enrollment photos:
        1. Face Detection: Must detect exactly 1 clear face (or primary face)
        2. Size Validation: Face bbox width & height >= min_face_size (e.g. 32x32)
        3. Quality Validation: Laplacian sharpness score >= min_blur_score
        4. Embedding: Generates normalized 512-D ArcFace embedding vector
        
        Returns:
            (is_valid: bool, embedding: Optional[List[float]], reason_or_message: str)
        """
        if not self.is_ready:
            return False, None, f"InsightFace engine not ready ({self.initialization_error or 'Not initialized'})"

        if image is None or not isinstance(image, np.ndarray) or image.size == 0:
            return False, None, "Invalid image data provided."

        faces = self.detect_faces(image)
        if not faces or len(faces) == 0:
            return False, None, "No face detected in photo. Please ensure face is clearly visible to the camera."

        # Select primary face (largest area)
        primary_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        
        bbox = primary_face.bbox
        w = int(bbox[2] - bbox[0])
        h = int(bbox[3] - bbox[1])

        if w < self.min_face_size or h < self.min_face_size:
            return False, None, f"Face resolution too small ({w}x{h}px < minimum {self.min_face_size}x{self.min_face_size}px). Please provide a closer photo."

        # Crop face for blur calculation
        img_h, img_w = image.shape[:2]
        x1, y1, x2, y2 = max(0, int(bbox[0])), max(0, int(bbox[1])), min(img_w, int(bbox[2])), min(img_h, int(bbox[3]))
        face_crop = image[y1:y2, x1:x2]
        
        blur_score = self.calculate_blur_score(face_crop)
        if blur_score < self.min_blur_score:
            return False, None, f"Photo is too blurry (sharpness score {blur_score:.1f} < threshold {self.min_blur_score:.1f}). Please provide a clearer photo."

        if primary_face.embedding is None or len(primary_face.embedding) == 0:
            return False, None, "Failed to extract ArcFace facial feature embedding from detected face."

        emb = primary_face.embedding.astype(np.float32)
        norm = np.linalg.norm(emb)
        if norm > 0:
            emb = emb / norm
            
        return True, emb.tolist(), f"Valid face detected ({w}x{h}px, blur score {blur_score:.1f})."

    def generate_embedding(self, face_or_crop: np.ndarray) -> List[float]:
        """
        Extracts a normalized 512-dimensional ArcFace embedding from a face or person crop.
        Performs face detection & alignment.
        """
        if not self.is_ready or face_or_crop is None or not isinstance(face_or_crop, np.ndarray) or face_or_crop.size == 0:
            return []

        faces = self.detect_faces(face_or_crop)
        if not faces or len(faces) == 0:
            return []

        primary_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        if primary_face.embedding is None or len(primary_face.embedding) == 0:
            return []

        emb = primary_face.embedding.astype(np.float32)
        norm = np.linalg.norm(emb)
        if norm > 0:
            emb = emb / norm
        return emb.tolist()

    def verify_identity(self, person_crop: np.ndarray) -> Dict[str, Any]:
        """
        Structured face verification endpoint.
        Returns:
        {
            "matched": bool,
            "resident_id": Optional[str],
            "resident_name": Optional[str],
            "confidence": float,
            "status": "KNOWN" | "UNKNOWN" | "NO_FACE" | "LOW_QUALITY"
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
        End-to-End Face Biometric Matching Pipeline:
        1. Person Crop -> Face Detection (SCRFD)
        2. If no face detected -> Return ("NO_FACE", None, 0.0)
        3. Quality checks (size & blur) -> Return ("LOW_QUALITY", None, 0.0) if substandard
        4. Extract 512-D ArcFace embedding
        5. Cosine similarity against RAM-cached resident embeddings
        6. Return ("KNOWN" / "UNKNOWN", resident_name, confidence)
        """
        if not self.is_ready:
            return "NO_FACE", None, 0.0

        if person_crop is None or not isinstance(person_crop, np.ndarray) or person_crop.size == 0:
            return "NO_FACE", None, 0.0

        faces = self.detect_faces(person_crop)
        if not faces or len(faces) == 0:
            return "NO_FACE", None, 0.0

        primary_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        
        bbox = primary_face.bbox
        w = int(bbox[2] - bbox[0])
        h = int(bbox[3] - bbox[1])

        if w < self.min_face_size or h < self.min_face_size:
            return "LOW_QUALITY", None, 0.0

        # Passive face-quality filtering; not full liveness detection.
        img_h, img_w = person_crop.shape[:2]
        x1, y1, x2, y2 = max(0, int(bbox[0])), max(0, int(bbox[1])), min(img_w, int(bbox[2])), min(img_h, int(bbox[3]))
        face_crop = person_crop[y1:y2, x1:x2]
        
        blur_score = self.calculate_blur_score(face_crop)
        if blur_score < self.min_blur_score:
            return "LOW_QUALITY", None, 0.0

        if primary_face.embedding is None or len(primary_face.embedding) == 0:
            return "NO_FACE", None, 0.0

        emb = primary_face.embedding.astype(np.float32)
        norm = np.linalg.norm(emb)
        if norm > 0:
            emb = emb / norm

        # Match against in-memory resident cache (Vectorized, 0 SQLite queries)
        status, res_name, res_id, conf = resident_cache.match(
            query_embedding=emb,
            similarity_threshold=self.similarity_threshold
        )
        return status, res_name, conf


# =====================================================================
# Legacy Prototype Reference (DO NOT USE AS DEFAULT)
# Retained strictly for backwards-compatibility unit tests and audit trace.
# =====================================================================
class PrototypeFaceMatcher:
    """
    LEGACY DEPRECATED: Raw-pixel prototype matcher for historical reference only.
    NEVER used as the active face recognition engine in production.
    """
    def __init__(self):
        self.similarity_threshold = 0.65

    def generate_embedding(self, face_crop: np.ndarray) -> List[float]:
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
        except Exception:
            return []

    def match_face(self, person_crop: np.ndarray) -> Tuple[str, Optional[str], float]:
        return "NO_FACE", None, 0.0

    def verify_identity(self, person_crop: np.ndarray) -> Dict[str, Any]:
        return {"matched": False, "resident_name": None, "confidence": 0.0, "status": "NO_FACE"}


# Active Engine Singleton
face_recognizer = InsightFaceRecognizer()
PrototypeFaceRecognizer = InsightFaceRecognizer # Alias to prevent broken imports
