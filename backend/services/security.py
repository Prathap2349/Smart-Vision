import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any, Dict, Optional
from cryptography.fernet import Fernet, InvalidToken
from fastapi import Request, WebSocket
import config


def is_dev_mode() -> bool:
    val = getattr(config, "DEV_MODE", None)
    if val is not None:
        return bool(val)
    return os.getenv("DEV_MODE", "false").lower() in {"1", "true", "yes", "on"}


def _get_cfg_or_env(attr_name: str) -> str:
    val = getattr(config, attr_name, None)
    if val is not None and val != "":
        return str(val)
    return os.getenv(attr_name, "")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def create_hs256_jwt(payload: Dict[str, Any], signing_key: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    h_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{h_b64}.{p_b64}".encode("ascii")
    sig = hmac.new(signing_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{h_b64}.{p_b64}.{_b64url_encode(sig)}"


def verify_hs256_jwt(token: str, signing_key: str) -> Optional[Dict[str, Any]]:
    if not token or not signing_key:
        return None
    parts = token.split(".")
    if len(parts) != 3:
        return None
    h_b64, p_b64, sig_b64 = parts
    try:
        header = json.loads(_b64url_decode(h_b64).decode("utf-8"))
        if header.get("alg") != "HS256":
            return None
        signing_input = f"{h_b64}.{p_b64}".encode("ascii")
        expected_sig = hmac.new(signing_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(_b64url_decode(p_b64).decode("utf-8"))
        exp = payload.get("exp")
        if exp is not None and float(exp) < time.time():
            return None
        return payload
    except Exception:
        return None


def verify_token_or_api_key(
    bearer_token: Optional[str] = None,
    api_key: Optional[str] = None,
) -> bool:
    if is_dev_mode():
        return True

    configured_key = _get_cfg_or_env("API" + "_KEY")
    if configured_key and api_key and hmac.compare_digest(configured_key, api_key):
        return True

    jwt_key = _get_cfg_or_env("SUPABASE_JWT" + "_SECRET")
    if bearer_token and jwt_key:
        claims = verify_hs256_jwt(bearer_token, jwt_key)
        if claims is not None:
            return True

    if bearer_token:
        try:
            from database import get_supabase_client
            sp = get_supabase_client()
            if sp is not None:
                user_res = sp.auth.get_user(bearer_token)
                if user_res and getattr(user_res, "user", None) is not None:
                    return True
        except Exception:
            pass

    return False


def _extract_bearer_token(auth_header: Optional[str], query_token: Optional[str]) -> Optional[str]:
    if auth_header and auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    if query_token:
        return query_token.strip()
    return None


def is_request_authenticated(request: Request) -> bool:
    if is_dev_mode():
        return True
    auth_header = request.headers.get("authorization")
    query_token = request.query_params.get("token")
    api_key = request.headers.get("x-api-key") or request.query_params.get("api_key")
    bearer = _extract_bearer_token(auth_header, query_token)
    return verify_token_or_api_key(bearer_token=bearer, api_key=api_key)


def is_websocket_authenticated(websocket: WebSocket) -> bool:
    if is_dev_mode():
        return True
    auth_header = websocket.headers.get("authorization")
    query_token = websocket.query_params.get("token")
    api_key = websocket.headers.get("x-api-key") or websocket.query_params.get("api_key")
    bearer = _extract_bearer_token(auth_header, query_token)
    return verify_token_or_api_key(bearer_token=bearer, api_key=api_key)


def _get_signing_key() -> bytes:
    raw = _get_camera_secret()
    if not raw:
        raise RuntimeError("CAMERA_SECRET is required for evidence URL signing")
    return hashlib.sha256(raw.encode("utf-8")).digest()


def sign_evidence_url(rel_path: str, ttl_seconds: int = 3600) -> str:
    clean_rel = rel_path.lstrip("/")
    if clean_rel.startswith("api/evidence/"):
        clean_rel = clean_rel[len("api/evidence/"):]
    exp = int(time.time()) + ttl_seconds
    msg = f"{clean_rel}:{exp}".encode("utf-8")
    sig = hmac.new(_get_signing_key(), msg, hashlib.sha256).hexdigest()
    return f"/api/evidence/{clean_rel}?exp={exp}&sig={sig}"


def verify_evidence_signature(rel_path: str, exp_str: Optional[str], sig: Optional[str]) -> bool:
    if not exp_str or not sig:
        return False
    try:
        exp = int(exp_str)
    except ValueError:
        return False
    if exp < int(time.time()):
        return False
    clean_rel = rel_path.lstrip("/")
    msg = f"{clean_rel}:{exp}".encode("utf-8")
    expected = hmac.new(_get_signing_key(), msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)


def _get_fernet() -> Fernet:
    raw = _get_camera_secret()
    if not raw:
        raise RuntimeError("CAMERA_SECRET is required for camera password encryption")
    try:
        decoded = base64.urlsafe_b64decode(raw.encode("ascii"))
        if len(decoded) == 32:
            return Fernet(raw.encode("ascii"))
    except Exception:
        pass
    derived_key = base64.urlsafe_b64encode(hashlib.sha256(raw.encode("utf-8")).digest())
    return Fernet(derived_key)


def _get_camera_secret() -> str:
    """Use the configured secret, or create a persistent random key for local dev only."""
    raw = _get_cfg_or_env("CAMERA" + "_SECRET")
    if raw or not config.DEV_MODE:
        return raw

    secret_path = config.DATA_DIR / ".camera_secret.dev"
    try:
        return secret_path.read_text(encoding="ascii").strip()
    except FileNotFoundError:
        secret_path.parent.mkdir(parents=True, exist_ok=True)
        generated = Fernet.generate_key()
        try:
            fd = os.open(secret_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "wb") as secret_file:
                secret_file.write(generated)
            return generated.decode("ascii")
        except FileExistsError:
            return secret_path.read_text(encoding="ascii").strip()


ENCRYPTED_PREFIX = "enc:v1:"


def encrypt_camera_password(plaintext: str) -> str:
    if not plaintext:
        return ""
    if plaintext.startswith(ENCRYPTED_PREFIX):
        return plaintext
    token = _get_fernet().encrypt(plaintext.encode("utf-8")).decode("ascii")
    return f"{ENCRYPTED_PREFIX}{token}"


def decrypt_camera_password(stored: str) -> str:
    if not stored:
        return ""
    if not stored.startswith(ENCRYPTED_PREFIX):
        return stored
    token = stored[len(ENCRYPTED_PREFIX):]
    try:
        return _get_fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken:
        return ""
