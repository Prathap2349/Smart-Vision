#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
PORT="${PORT:-8000}"
TUNNEL_PROVIDER="${TUNNEL_PROVIDER:-auto}"
UVICORN_BIN="${UVICORN_BIN:-$ROOT/.venv/bin/uvicorn}"
if [[ ! -x "$UVICORN_BIN" ]]; then UVICORN_BIN="$(command -v uvicorn || true)"; fi
if [[ -z "$UVICORN_BIN" ]]; then
  echo "uvicorn not found. Create .venv and install backend/requirements.txt first." >&2
  exit 1
fi

if [[ "$TUNNEL_PROVIDER" == "auto" ]]; then
  if command -v cloudflared >/dev/null 2>&1; then TUNNEL_PROVIDER=cloudflared
  elif command -v ngrok >/dev/null 2>&1; then TUNNEL_PROVIDER=ngrok
  else
    echo "Install cloudflared or ngrok, then rerun this script." >&2
    exit 1
  fi
fi

UVICORN_LOG="$(mktemp)"
TUNNEL_LOG="$(mktemp)"
cleanup() {
  [[ -n "${TUNNEL_PID:-}" ]] && kill "$TUNNEL_PID" 2>/dev/null || true
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null || true
  rm -f "$UVICORN_LOG" "$TUNNEL_LOG"
}
trap cleanup EXIT INT TERM

(
  cd "$BACKEND_DIR"
  "$UVICORN_BIN" main:app --host 127.0.0.1 --port "$PORT"
) >"$UVICORN_LOG" 2>&1 &
API_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$API_PID" 2>/dev/null; then cat "$UVICORN_LOG"; exit 1; fi
  sleep 1
done

case "$TUNNEL_PROVIDER" in
  cloudflared)
    cloudflared tunnel --url "http://127.0.0.1:$PORT" --no-autoupdate >"$TUNNEL_LOG" 2>&1 &
    TUNNEL_PID=$!
    PUBLIC_URL=""
    for _ in $(seq 1 60); do
      PUBLIC_URL="$(sed -nE 's#.*(https://[a-zA-Z0-9-]+\.trycloudflare\.com).*#\1#p' "$TUNNEL_LOG" | head -n 1)"
      [[ -n "$PUBLIC_URL" ]] && break
      sleep 1
    done
    ;;
  ngrok)
    ngrok http "$PORT" --log stdout --log-format json >"$TUNNEL_LOG" 2>&1 &
    TUNNEL_PID=$!
    PUBLIC_URL=""
    for _ in $(seq 1 60); do
      PUBLIC_URL="$(python3 - <<'PY'
import json, urllib.request
try:
    with urllib.request.urlopen('http://127.0.0.1:4040/api/tunnels', timeout=1) as r:
        data = json.load(r)
    print(next((t['public_url'] for t in data.get('tunnels', []) if t.get('public_url', '').startswith('https://')), ''))
except Exception:
    print('')
PY
)"
      [[ -n "$PUBLIC_URL" ]] && break
      sleep 1
    done
    ;;
  *) echo "TUNNEL_PROVIDER must be auto, cloudflared, or ngrok." >&2; exit 2 ;;
esac

if [[ -z "${PUBLIC_URL:-}" ]]; then
  echo "Tunnel did not provide a public HTTPS URL. Check $TUNNEL_PROVIDER setup." >&2
  cat "$TUNNEL_LOG" >&2
  exit 1
fi

WS_URL="wss://${PUBLIC_URL#https://}"
echo "Backend health: ${PUBLIC_URL}/api/health"
echo "Set these Vercel project environment variables, then redeploy:"
echo "VITE_API_BASE_URL=${PUBLIC_URL}/api"
echo "VITE_WS_BASE_URL=${WS_URL}"
echo "Press Ctrl-C to stop the backend and tunnel."
wait "$TUNNEL_PID"
