FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATA_DIR=/data \
    MODELS_DIR=/opt/models \
    DEV_MODE=false \
    PORT=8000

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libglib2.0-0 \
    libgomp1 \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
    torch==2.5.1+cpu torchvision==0.20.1+cpu
RUN pip install --no-cache-dir -r requirements.txt
RUN pip uninstall -y opencv-python opencv-python-headless \
    && pip install --no-cache-dir --force-reinstall --no-deps opencv-python-headless==4.10.0.84 \
    && python -c "import cv2; print(cv2.__version__)"

COPY backend/ ./

# Bake both model families into the image so startup never needs model downloads.
RUN mkdir -p /opt/models /data/evidence \
    && python - <<'PY'
from ultralytics import YOLO
from insightface.app import FaceAnalysis

YOLO("yolov8n.pt")
face_app = FaceAnalysis(name="buffalo_s", root="/opt/models", providers=["CPUExecutionProvider"])
face_app.prepare(ctx_id=0, det_size=(640, 640))
PY

RUN useradd --create-home --uid 10001 sentry \
    && mkdir -p /data/evidence \
    && chown -R sentry:sentry /data /home/sentry \
    && chmod -R a+rX /opt/models /app/yolov8n.pt
USER sentry

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=300s --retries=3 \
    CMD python -c "from urllib.request import urlopen; urlopen('http://127.0.0.1:' + __import__('os').getenv('PORT', '8000') + '/api/health', timeout=4)" || exit 1

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
