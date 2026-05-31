#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BE="$ROOT/2026-oss-be"
FE="$ROOT/2026-oss-project"

# ── 색상 ──────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[ArtPass]${NC} $1"; }
warn()  { echo -e "${YELLOW}[ArtPass]${NC} $1"; }
error() { echo -e "${RED}[ArtPass]${NC} $1"; exit 1; }

# ── 종료 시 백그라운드 프로세스 정리 ──────────
cleanup() {
  info "서버를 종료합니다..."
  kill "$BE_PID" "$FE_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# ════════════════════════════════════════════
# 백엔드 준비
# ════════════════════════════════════════════
info "백엔드 환경 확인 중..."

if [ ! -d "$BE/venv" ]; then
  info "가상환경 생성 중..."
  python3 -m venv "$BE/venv"
fi

info "패키지 설치 확인 중..."
PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 \
  "$BE/venv/bin/pip" install -q -r "$BE/requirements.txt"

# .env 없으면 경고
if [ ! -f "$BE/.env" ]; then
  warn ".env 파일이 없습니다. 2026-oss-be/.env 에 ANTHROPIC_API_KEY 를 설정하세요."
fi

info "백엔드 시작 (포트 4000)..."
cd "$BE"
"$BE/venv/bin/uvicorn" main:app --host 0.0.0.0 --port 4000 &
BE_PID=$!

# ════════════════════════════════════════════
# 프론트엔드 준비
# ════════════════════════════════════════════
info "프론트엔드 환경 확인 중..."

if [ ! -d "$FE/node_modules" ]; then
  info "패키지 설치 중..."
  cd "$FE" && npm install --silent
fi

info "프론트엔드 시작 (포트 5173)..."
cd "$FE"
npm run dev -- --host &
FE_PID=$!

# ════════════════════════════════════════════
info "✅ ArtPass 실행 중"
info "   프론트엔드: http://localhost:3000"
info "   백엔드 API: http://localhost:4000"
info "   API 문서:   http://localhost:4000/docs"
info "종료하려면 Ctrl+C 를 누르세요."

wait
