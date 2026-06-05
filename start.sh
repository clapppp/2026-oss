#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BE="$ROOT/2026-oss-be"
FE="$ROOT/2026-oss-project"
PORT="${PORT:-3000}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[ArtPass]${NC} $1"; }
warn()  { echo -e "${YELLOW}[ArtPass]${NC} $1"; }
error() { echo -e "${RED}[ArtPass]${NC} $1"; exit 1; }

# ── .env 확인 ────────────────────────────────────────────────
if [ ! -f "$BE/.env" ]; then
  error "2026-oss-be/.env 파일이 없습니다. ANTHROPIC_API_KEY 와 KOPIS_API_KEY 를 설정하세요."
fi

# ── 시스템 패키지 ─────────────────────────────────────────────
info "시스템 패키지 확인 중..."

if ! command -v tesseract &>/dev/null; then
  info "Tesseract 설치 중..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq tesseract-ocr tesseract-ocr-kor
fi

if ! command -v node &>/dev/null; then
  info "Node.js 설치 중..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null
  sudo apt-get install -y -qq nodejs
fi

if ! command -v python3 &>/dev/null; then
  error "python3 가 설치되어 있지 않습니다. sudo apt-get install python3 python3-venv 를 실행하세요."
fi

# ── 백엔드 의존성 ─────────────────────────────────────────────
info "백엔드 패키지 설치 중..."

if [ ! -d "$BE/venv" ]; then
  python3 -m venv "$BE/venv"
fi
"$BE/venv/bin/pip" install -q --upgrade pip
"$BE/venv/bin/pip" install -q -r "$BE/requirements.txt"

# ── 프론트엔드 빌드 ──────────────────────────────────────────
info "프론트엔드 빌드 중..."
cd "$FE"

if [ ! -d node_modules ]; then
  npm install --silent
fi

# API 경로를 상대경로로 빌드 (FastAPI가 같은 포트에서 서빙)
VITE_API_BASE_URL="" npm run build

# ── 외부 API 연결 확인 ───────────────────────────────────────
info "외부 API 연결 확인 중..."

"$BE/venv/bin/python3" - << PYEOF
import os, sys
from dotenv import load_dotenv
load_dotenv("$BE/.env")

ok = True

# Anthropic
try:
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    client.messages.create(model="claude-haiku-4-5-20251001", max_tokens=10,
                           messages=[{"role":"user","content":"ping"}])
    print("\033[0;32m[ArtPass]\033[0m ✅ Anthropic API 정상")
except Exception as e:
    print(f"\033[0;31m[ArtPass]\033[0m ❌ Anthropic API 오류: {e}")
    ok = False

# KOPIS
try:
    import httpx
    key = os.environ.get("KOPIS_API_KEY", "")
    resp = httpx.get("http://kopis.or.kr/openApi/restful/pblprfr",
                     params={"service": key, "stdate":"20240101","eddate":"20241231",
                             "shprfnm":"테스트","rows":1,"cpage":1}, timeout=10)
    if "errmsg" in resp.text and "SERVICE KEY" in resp.text:
        raise Exception("API 키 미등록")
    print("\033[0;32m[ArtPass]\033[0m ✅ KOPIS API 정상")
except Exception as e:
    print(f"\033[1;33m[ArtPass]\033[0m ⚠️  KOPIS API 오류: {e}")

# Tesseract
try:
    import subprocess
    r = subprocess.run(["tesseract", "--version"], capture_output=True, timeout=5)
    ver = r.stdout.decode().split("\n")[0] if r.returncode == 0 else ""
    if not ver:
        raise Exception("실행 불가")
    print(f"\033[0;32m[ArtPass]\033[0m ✅ Tesseract 정상 ({ver})")
except Exception as e:
    print(f"\033[0;31m[ArtPass]\033[0m ❌ Tesseract 오류: {e}")
    ok = False

sys.exit(0 if ok else 1)
PYEOF

if [ $? -ne 0 ]; then
  error "필수 API 연결에 실패했습니다. .env 설정을 확인하세요."
fi

# ── 서버 시작 ────────────────────────────────────────────────
info "서버 시작 (포트 $PORT)..."
cd "$BE"

cleanup() {
  info "서버를 종료합니다..."
  kill "$BE_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

"$BE/venv/bin/uvicorn" main:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --workers 1 &
BE_PID=$!

SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
info "✅ ArtPass 실행 중"
info "   http://${SERVER_IP}:${PORT}"
info "   API 문서: http://${SERVER_IP}:${PORT}/docs"
info "종료하려면 Ctrl+C 를 누르세요."

wait "$BE_PID"
