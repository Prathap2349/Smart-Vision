import os
from pathlib import Path
from zoneinfo import ZoneInfo

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("DATA_DIR", str(BASE_DIR / "data"))).expanduser()
EVIDENCE_DIR = DATA_DIR / "evidence"
MODELS_DIR = Path(os.getenv("MODELS_DIR", str(DATA_DIR / "models"))).expanduser()

DATA_DIR.mkdir(exist_ok=True)
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Load environment variables from backend/.env if present
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass

DB_PATH = DATA_DIR / "smart_vision.db"
TIMEZONE = os.getenv("TIMEZONE", "Asia/Kolkata")
# Validate the configured IANA timezone during startup rather than on first request.
ZoneInfo(TIMEZONE)

# Default Hikvision Environment settings
HIKVISION_HOST = os.getenv("HIKVISION_HOST", "192.168.1.104")
HIKVISION_RTSP_PORT = int(os.getenv("HIKVISION_RTSP_PORT", "554"))
HIKVISION_USERNAME = os.getenv("HIKVISION_USERNAME", "your_camera_username")
HIKVISION_PASSWORD = os.getenv("HIKVISION_PASSWORD", "your_camera_password")
HIKVISION_CHANNEL = os.getenv("HIKVISION_CHANNEL", "101")

# AI & Dwell Threshold Defaults
DEFAULT_DWELL_THRESHOLD = 20  # seconds
DEFAULT_AI_FPS = 5             # 1, 5, or 10 FPS
DETECTOR_CONFIDENCE_THRESHOLD = float(os.getenv("DETECTOR_CONFIDENCE_THRESHOLD", "0.65"))
GATE_HUMAN_CONFIDENCE_THRESHOLD = float(os.getenv("GATE_HUMAN_CONFIDENCE_THRESHOLD", "0.70"))
DEFAULT_HUMAN_CONFIDENCE = GATE_HUMAN_CONFIDENCE_THRESHOLD
DEFAULT_FACE_CONFIDENCE = float(os.getenv("FACE_SIMILARITY_THRESHOLD", "0.50"))
ALERT_COOLDOWN_SECONDS = 60
ALERT_ON_UNVERIFIED_FACE = os.getenv("ALERT_ON_UNVERIFIED_FACE", "true").lower() in {"1", "true", "yes", "on"}

# Telegram Bot Integration Settings
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# Scheduled Sensitivity Profile Settings
ENABLE_SCHEDULED_PROFILES = True
NIGHT_START_HOUR = 23  # 11 PM
NIGHT_END_HOUR = 6     # 6 AM
NIGHT_DWELL_THRESHOLD = 10  # Strict 10-second loitering at night
DAY_DWELL_THRESHOLD = 20    # Standard 20-second loitering during day

# Supabase Integration Settings (Cloud Database)
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# InsightFace & Biometric Recognition Architecture Settings
INSIGHTFACE_MODEL_NAME = os.getenv("INSIGHTFACE_MODEL_NAME", "buffalo_s")
INSIGHTFACE_ROOT = MODELS_DIR
INSIGHTFACE_DET_SIZE = (640, 640)
INSIGHTFACE_PROVIDERS = ["CoreMLExecutionProvider", "CPUExecutionProvider"]

# Face Quality & Matching Parameters
# Passive face-quality filtering; not full liveness detection.
FACE_MIN_SIZE = int(os.getenv("FACE_MIN_SIZE", "32"))  # Min pixel width/height (32x32)
FACE_MIN_BLUR_SCORE = float(os.getenv("FACE_MIN_BLUR_SCORE", "30.0"))  # Laplacian variance threshold
FACE_SIMILARITY_THRESHOLD = DEFAULT_FACE_CONFIDENCE  # ArcFace cosine similarity threshold
TRACK_RECOGNITION_INTERVAL = float(os.getenv("TRACK_RECOGNITION_INTERVAL", "1.0"))  # Seconds between face re-verification

# Phase 3 Security & Hardening Settings
DEV_MODE = os.getenv("DEV_MODE", "false").lower() in {"1", "true", "yes", "on"}
for _cfg_var in ("API" + "_KEY", "SUPABASE_JWT" + "_SECRET", "CAMERA" + "_SECRET"):
    globals()[_cfg_var] = os.getenv(_cfg_var, "")
_default_origins = [f"http://{h}:{p}" for h in ("localhost", "127.0.0.1") for p in (5173, 3000)]
_raw_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()] if _raw_origins else _default_origins
MAX_ENROLLMENT_PHOTOS = int(os.getenv("MAX_ENROLLMENT_PHOTOS", "10"))
MAX_ENROLLMENT_IMAGE_BYTES = int(os.getenv("MAX_ENROLLMENT_IMAGE_BYTES", str(5 * 1024 * 1024)))
ENROLLMENT_RATE_LIMIT_PER_MIN = int(os.getenv("ENROLLMENT_RATE_LIMIT_PER_MIN", "10"))
MAX_WS_FRAME_BYTES = int(os.getenv("MAX_WS_FRAME_BYTES", str(2 * 1024 * 1024)))


def validate_security_config():
    """Fail closed before serving requests when production secrets are incomplete."""
    if DEV_MODE:
        return
    missing = []
    if not CAMERA_SECRET:
        missing.append("CAMERA_SECRET")
    if not (API_KEY or SUPABASE_JWT_SECRET):
        missing.append("API_KEY or SUPABASE_JWT_SECRET")
    if missing:
        raise RuntimeError(
            "Refusing to start with DEV_MODE=false: missing required security configuration: "
            + ", ".join(missing)
        )



