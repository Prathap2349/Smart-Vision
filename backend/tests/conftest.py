"""Explicit local test configuration; production defaults remain fail-closed."""
import os
import sys
import types

os.environ["DEV_MODE"] = "true"
os.environ["CAMERA_SECRET"] = "test-only-camera-secret-not-for-production"


# Replace model packages before app imports them so pytest never loads/downloads weights.
class _FakeYOLO:
    def __init__(self, model_path):
        self.model_path = model_path

    def __call__(self, *args, **kwargs):
        return []


class _FakeFaceAnalysis:
    def __init__(self, *args, **kwargs):
        self.models = {}

    def prepare(self, *args, **kwargs):
        pass

    def get(self, image):
        return []


fake_ultralytics = types.ModuleType("ultralytics")
fake_ultralytics.YOLO = _FakeYOLO
fake_ultralytics.__path__ = []
fake_ultralytics_utils = types.ModuleType("ultralytics.utils")
fake_ultralytics_utils.ASSETS = "/nonexistent/test-assets"
sys.modules["ultralytics"] = fake_ultralytics
sys.modules["ultralytics.utils"] = fake_ultralytics_utils

fake_insightface = types.ModuleType("insightface")
fake_insightface.__path__ = []
fake_insightface_app = types.ModuleType("insightface.app")
fake_insightface_app.FaceAnalysis = _FakeFaceAnalysis
fake_insightface.app = fake_insightface_app
sys.modules["insightface"] = fake_insightface
sys.modules["insightface.app"] = fake_insightface_app
