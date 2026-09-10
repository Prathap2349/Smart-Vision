import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
EVIDENCE_DIR = DATA_DIR / "evidence"

DATA_DIR.mkdir(exist_ok=True)
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

# Load environment variables from backend/.env if present
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass

DB_PATH = DATA_DIR / "smart_vision.db"

# Default Hikvision Environment settings
HIKVISION_HOST = os.getenv("HIKVISION_HOST", "192.168.1.104")
HIKVISION_RTSP_PORT = int(os.getenv("HIKVISION_RTSP_PORT", "554"))
HIKVISION_USERNAME = os.getenv("HIKVISION_USERNAME", "admin")
HIKVISION_PASSWORD = os.getenv("HIKVISION_PASSWORD", "admin123")
HIKVISION_CHANNEL = os.getenv("HIKVISION_CHANNEL", "101")

# AI & Dwell Threshold Defaults
DEFAULT_DWELL_THRESHOLD = 20  # seconds
DEFAULT_AI_FPS = 5             # 1, 5, or 10 FPS
DEFAULT_HUMAN_CONFIDENCE = 0.85
DEFAULT_FACE_CONFIDENCE = 0.90
ALERT_COOLDOWN_SECONDS = 60

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
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://phiboawjlfnzlrdcsddv.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
