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
            print("YOLOv8-Nano initialized successfully.")
        except Exception as e:
            print(f"YOLOv8 init warning: {e}. Using OpenCV contour detector fallback.")
            self.hog = None
            if hasattr(cv2, 'HOGDescriptor'):
                try:
                    self.hog = cv2.HOGDescriptor()
                    if hasattr(cv2.HOGDescriptor, 'getDefaultPeopleDetector'):
                        self.hog.setSVMDetector(cv2.HOGDescriptor.getDefaultPeopleDetector())
                except Exception:
                    self.hog = None

    def detect_people(self, frame: np.ndarray, conf_threshold: float = 0.85) -> List[Dict[str, Any]]:
        if frame is None or frame.size == 0:
            return []

        results = []

        if self.model is not None:
            try:
                preds = self.model(frame, verbose=False, conf=conf_threshold, classes=[0]) # 0 is person in COCO
                for r in preds:
                    for box in r.boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().tolist()
                        conf = float(box.conf[0].cpu().numpy())
                        results.append({
                            "class": "person",
                            "confidence": round(conf, 2),
                            "bbox": [round(x1), round(y1), round(x2), round(y2)]
                        })
                return results
            except Exception as e:
                pass

        if self.hog is not None:
            try:
                boxes, weights = self.hog.detectMultiScale(frame, winStride=(8, 8))
                for (x, y, w, h), weight in zip(boxes, weights):
                    if weight >= conf_threshold * 0.5:
                        results.append({
                            "class": "person",
                            "confidence": round(float(weight), 2),
                            "bbox": [int(x), int(y), int(x + w), int(y + h)]
                        })
            except Exception:
                pass

        return results

        # OpenCV HOG Fallback Person Detector
        try:
            h, w, _ = frame.shape
            boxes, weights = self.hog.detectMultiScale(frame, winStride=(8, 8), padding=(4, 4), scale=1.05)
            for (x, y, bw, bh), weight in zip(boxes, weights):
                if weight >= 0.3:
                    results.append({
                        "class": "person",
                        "confidence": round(min(0.98, float(weight + 0.6)), 2),
                        "bbox": [x, y, x + bw, y + bh]
                    })
        except Exception:
            pass

        return results

yolo_detector = YOLOv8PersonDetector()
