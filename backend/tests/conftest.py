"""Explicit local test configuration; production defaults remain fail-closed."""
import os

os.environ["DEV_MODE"] = "true"
os.environ["CAMERA_SECRET"] = "test-only-camera-secret-not-for-production"
