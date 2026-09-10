import cv2
import numpy as np
from typing import List, Dict, Any

class YOLOv8PersonDetector:
    def __init__(self):
        self.model = None
        self._init_model()

    def _init_model(self):
        try:
            from ultralytics import YOLO
            self.model = YOLO('yolov8n.pt')
            print("[Detector] YOLOv8-Nano initialized successfully.")
        except Exception as e:
            print(f"[Detector Warning] YOLOv8 initialization unavailable: {e}")
            self.model = None

    @property
    def is_ready(self) -> bool:
        return self.model is not None

    def detect(self, frame: np.ndarray, conf_threshold: float = 0.85) -> List[Dict[str, Any]]:
        """
        Strict YOLO human presence detection (COCO class 0 = person).
        Returns a list of standardized detection dictionaries:
        {
            "bbox": [x1, y1, x2, y2],
            "confidence": 0.95,
            "class_id": 0,
            "class_name": "person"
        }
        Returns [] if YOLO is unavailable or no persons detected.
        """
        if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0:
            return []

        if self.model is None:
            return []

        results = []
        try:
            preds = self.model(frame, verbose=False, conf=conf_threshold, classes=[0])  # 0 is person in COCO
            for r in preds:
                for box in r.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().tolist()
                    conf = float(box.conf[0].cpu().numpy())
                    results.append({
                        "bbox": [int(round(x1)), int(round(y1)), int(round(x2)), int(round(y2))],
                        "confidence": round(conf, 2),
                        "class_id": 0,
                        "class_name": "person"
                    })
            return results
        except Exception as e:
            print(f"[Detector Error] YOLO inference error: {e}")
            return []

    def detect_people(self, frame: np.ndarray, conf_threshold: float = 0.85) -> List[Dict[str, Any]]:
        """Backward-compatible wrapper method."""
        return self.detect(frame, conf_threshold)

yolo_detector = YOLOv8PersonDetector()
