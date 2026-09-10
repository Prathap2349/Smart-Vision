import cv2
import numpy as np
from typing import List, Dict, Any

class YOLOv8PersonDetector:
    def __init__(self):
        self.model = None
        self.hog = None
        self._init_model()

    def _init_model(self):
        try:
            from ultralytics import YOLO
            self.model = YOLO('yolov8n.pt')
            print("[Detector] YOLOv8-Nano initialized successfully.")
        except Exception as e:
            print(f"[Detector] YOLOv8 init warning: {e}. Falling back to OpenCV contour/HOG detector.")
            if hasattr(cv2, 'HOGDescriptor'):
                try:
                    self.hog = cv2.HOGDescriptor()
                    if hasattr(cv2.HOGDescriptor, 'getDefaultPeopleDetector'):
                        self.hog.setSVMDetector(cv2.HOGDescriptor.getDefaultPeopleDetector())
                except Exception:
                    self.hog = None

    def detect(self, frame: np.ndarray, conf_threshold: float = 0.85) -> List[Dict[str, Any]]:
        """
        Primary detection method for human presence.
        Returns a list of standardized detection dictionaries:
        {
            "bbox": [x1, y1, x2, y2],
            "confidence": 0.95,
            "class_id": 0,
            "class_name": "person"
        }
        """
        if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0:
            return []

        results = []

        # 1. Primary Ultralytics YOLO Inference
        if self.model is not None:
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

        # 2. OpenCV HOG Fallback
        if self.hog is not None:
            try:
                boxes, weights = self.hog.detectMultiScale(frame, winStride=(8, 8))
                for (x, y, w, h), weight in zip(boxes, weights):
                    conf = round(float(weight), 2)
                    if conf >= conf_threshold * 0.4:
                        results.append({
                            "bbox": [int(x), int(y), int(x + w), int(y + h)],
                            "confidence": conf,
                            "class_id": 0,
                            "class_name": "person"
                        })
            except Exception as e:
                print(f"[Detector Error] HOG inference error: {e}")

        return results

    def detect_people(self, frame: np.ndarray, conf_threshold: float = 0.85) -> List[Dict[str, Any]]:
        """Backward-compatible wrapper method."""
        return self.detect(frame, conf_threshold)

yolo_detector = YOLOv8PersonDetector()
