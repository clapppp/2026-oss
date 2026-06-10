import sqlite3
import json
import uuid
import bcrypt
import datetime
import os
import logging
import asyncio
import re
from typing import Optional

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logging.getLogger("python_multipart").setLevel(logging.WARNING)
log = logging.getLogger("artpass")

import jwt
import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks, UploadFile, File
from fastapi.responses import JSONResponse
from starlette.requests import ClientDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from ai_review import analyze_full_application
from kopis import lookup_all_entries as kopis_lookup_all
from kakao_book import lookup_all_entries as book_lookup_all

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=True)

app = FastAPI(title="ArtPass API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://140.245.73.203:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY 환경변수가 설정되지 않았습니다")
ALGORITHM = "HS256"
DB_PATH = "artpass.db"


ai_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
KOPIS_API_KEY  = os.environ.get("KOPIS_API_KEY", "")
KAKAO_API_KEY  = os.environ.get("KAKAO_API_KEY", "")


# ── DB ────────────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id            TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            birth         TEXT NOT NULL,
            gender        TEXT NOT NULL,
            phone         TEXT NOT NULL,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            nationality   TEXT DEFAULT 'korean',
            pen_name      TEXT DEFAULT '',
            profile_image TEXT DEFAULT '',
            role          TEXT DEFAULT 'user',
            created_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS applications (
            id              TEXT PRIMARY KEY,
            apply_no        TEXT NOT NULL,
            user_id         TEXT NOT NULL,
            type            TEXT NOT NULL,
            status          TEXT DEFAULT '심사중',
            status_date     TEXT NOT NULL,
            reason          TEXT,
            apply_date      TEXT NOT NULL,
            entries_json    TEXT NOT NULL,
            ai_feedback_json TEXT
        );

        CREATE TABLE IF NOT EXISTS drafts (
            user_id   TEXT PRIMARY KEY,
            saved_at  TEXT NOT NULL,
            data_json TEXT NOT NULL
        );
    """)
    conn.commit()
    # 기존 DB에 profile_image 컬럼 없으면 추가 (마이그레이션)
    try:
        conn.execute("ALTER TABLE users ADD COLUMN profile_image TEXT DEFAULT ''")
        conn.commit()
    except Exception:
        pass  # 이미 존재하면 무시
    conn.close()


init_db()


# 프로필 사진 저장 디렉토리
PHOTOS_DIR = os.path.join(os.path.dirname(__file__), "photos")
os.makedirs(PHOTOS_DIR, exist_ok=True)

# 임시저장 첨부파일 디렉토리
DRAFT_FILES_DIR = os.path.join(os.path.dirname(__file__), "draft_files")
os.makedirs(DRAFT_FILES_DIR, exist_ok=True)

# 신청서 첨부파일 디렉토리
APPLICATION_FILES_DIR = os.path.join(os.path.dirname(__file__), "application_files")
os.makedirs(APPLICATION_FILES_DIR, exist_ok=True)

# 파일 크기 제한 (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024


# ── Auth helpers ──────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def validate_password_strength(pw: str) -> str | None:
    """10자 이상 + 영문 + 숫자 + 특수문자 검사. 통과하면 None, 실패하면 에러 메시지."""
    if len(pw) < 10:
        return "비밀번호는 10자 이상이어야 합니다"
    if not re.search(r'[a-zA-Z]', pw):
        return "비밀번호에 영문자를 포함해야 합니다"
    if not re.search(r'[0-9]', pw):
        return "비밀번호에 숫자를 포함해야 합니다"
    if not re.search(r'[!@#$%^&*()\-_=+\[\]{};:\'",.<>/?\\|`~]', pw):
        return "비밀번호에 특수문자를 포함해야 합니다"
    return None


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


COOKIE_NAME = "artpass_token"

# ── 로그인 시도 제한 (메모리 기반) ────────────────────────
LOGIN_MAX_ATTEMPTS = 10       # 최대 실패 횟수
LOGIN_LOCKOUT_SECONDS = 300   # 잠금 시간 (5분)

_login_attempts: dict[str, dict] = {}
# { email: {"count": int, "locked_until": datetime | None} }

def _check_login_lockout(email: str) -> None:
    entry = _login_attempts.get(email)
    if not entry:
        return
    if entry.get("locked_until") and datetime.datetime.utcnow() < entry["locked_until"]:
        remaining = int((entry["locked_until"] - datetime.datetime.utcnow()).total_seconds())
        raise HTTPException(status_code=429, detail=f"로그인 시도가 너무 많습니다. {remaining}초 후 다시 시도해 주세요.")

def _record_login_failure(email: str) -> None:
    entry = _login_attempts.setdefault(email, {"count": 0, "locked_until": None})
    entry["count"] += 1
    if entry["count"] >= LOGIN_MAX_ATTEMPTS:
        entry["locked_until"] = datetime.datetime.utcnow() + datetime.timedelta(seconds=LOGIN_LOCKOUT_SECONDS)
        entry["count"] = 0

def _clear_login_attempts(email: str) -> None:
    _login_attempts.pop(email, None)


def seed_accounts():
    conn = get_db()
    accounts = [
        {
            "id": "00000000-0000-0000-0000-000000000001",
            "name": "홍길동", "birth": "19900515", "gender": "M",
            "phone": "01012345678", "email": "demo@artpass.kr",
            "password": "password1!", "role": "user",
        },
        {
            "id": "00000000-0000-0000-0000-000000000003",
            "name": "문지혁", "birth": "19950315", "gender": "M",
            "phone": "01011112222", "email": "demo1@artpass.kr",
            "password": "password1!", "role": "user",
        },
        {
            "id": "00000000-0000-0000-0000-000000000002",
            "name": "관리자", "birth": "19800101", "gender": "M",
            "phone": "01099999999", "email": "admin@artpass.kr",
            "password": "admin1!", "role": "admin",
        },
    ]
    for a in accounts:
        conn.execute(
            """INSERT INTO users (id, name, birth, gender, phone, email, password_hash, role, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                   email         = excluded.email,
                   password_hash = excluded.password_hash,
                   phone         = excluded.phone""",
            (a["id"], a["name"], a["birth"], a["gender"], a["phone"],
             a["email"], hash_password(a["password"]), a["role"],
             datetime.date.today().isoformat()),
        )
    conn.commit()
    conn.close()


seed_accounts()


def get_current_user(request: Request):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="토큰이 만료되었습니다")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다")
    return dict(row)


# ── Response helpers ──────────────────────────────────────────────────────────

def ok(data, message: Optional[str] = None):
    return {"success": True, "data": data, "message": message}


def user_schema(u: dict) -> dict:
    return {
        "name":         u["name"],
        "birth":        u["birth"],
        "gender":       u["gender"],
        "phone":        u["phone"],
        "email":        u["email"],
        "nationality":  u["nationality"],
        "penName":      u["pen_name"],
        "profileImage": u.get("profile_image") or "",
        "role":         u["role"],
    }


def app_schema(a: dict, applicant_name: str, applicant_pen_name: str = "") -> dict:
    entries = json.loads(a["entries_json"])
    # 파일 본문(base64)은 다운로드 전용 엔드포인트로 분리 — 목록 응답에서 제외
    for entry in entries:
        for f in entry.get("files", []):
            f.pop("data", None)
    categories = list(dict.fromkeys(e["category"] for e in entries))
    ai_feedback = json.loads(a["ai_feedback_json"]) if a.get("ai_feedback_json") else None
    return {
        "id":            a["apply_no"],
        "applyNo":       a["apply_no"],
        "applyDate":     a["apply_date"],
        "type":          a["type"],
        "categories":    categories,
        "status":        a["status"],
        "statusDate":    a["status_date"],
        "reason":        a["reason"],
        "entries":       entries,
        "applicantName":    applicant_name,
        "applicantPenName": applicant_pen_name,
        "aiFeedback":    ai_feedback,
    }


# ── Pydantic models ───────────────────────────────────────────────────────────

class LoginBody(BaseModel):
    email: str
    password: str


class SignupBody(BaseModel):
    name: str
    birth: str
    gender: str
    phone: str
    email: str
    password: str


class ReviewBody(BaseModel):
    status: str  # "승인" | "반려"
    reason: Optional[str] = None


class VerifyUserBody(BaseModel):
    email: str
    phone: str

class ResetPasswordBody(BaseModel):
    email: str
    phone: str
    new_password: str


class UpdateProfileBody(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    nationality: Optional[str] = None
    penName: Optional[str] = None


class ChangePasswordBody(BaseModel):
    currentPassword: str
    newPassword: str


# ── Auth routes ───────────────────────────────────────────────────────────────

@app.post("/api/auth/login")
def login(body: LoginBody):
    _check_login_lockout(body.email)

    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone()
    conn.close()

    if not row or not verify_password(body.password, row["password_hash"]):
        _record_login_failure(body.email)
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다")

    _clear_login_attempts(body.email)
    user = dict(row)
    token = create_token(user["id"])
    response = JSONResponse(content=ok({"user": user_schema(user)}))
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=7 * 24 * 3600,
    )
    return response


@app.post("/api/auth/logout")
def logout():
    response = JSONResponse(content=ok(None))
    response.delete_cookie(key=COOKIE_NAME, samesite="lax")
    return response


@app.get("/api/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return ok({"user": user_schema(current_user)})


@app.post("/api/auth/verify-user")
def verify_user(body: VerifyUserBody):
    """비밀번호 찾기 Step 1: 이메일+휴대폰 일치 여부 확인"""
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=400, detail="이메일 또는 휴대폰 번호가 일치하지 않습니다")
    stored_phone = dict(row)["phone"].replace("-", "").replace(" ", "")
    input_phone  = body.phone.replace("-", "").replace(" ", "")
    if stored_phone != input_phone:
        raise HTTPException(status_code=400, detail="이메일 또는 휴대폰 번호가 일치하지 않습니다")
    return ok(None)


@app.post("/api/auth/reset-password")
def reset_password(body: ResetPasswordBody):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=400, detail="이메일 또는 휴대폰 번호가 일치하지 않습니다")

    stored_phone = dict(row)["phone"].replace("-", "").replace(" ", "")
    input_phone  = body.phone.replace("-", "").replace(" ", "")
    if stored_phone != input_phone:
        raise HTTPException(status_code=400, detail="이메일 또는 휴대폰 번호가 일치하지 않습니다")

    pw_err = validate_password_strength(body.new_password)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)

    conn = get_db()
    conn.execute(
        "UPDATE users SET password_hash = ? WHERE email = ?",
        (hash_password(body.new_password), body.email),
    )
    conn.commit()
    conn.close()
    return ok(None)


@app.post("/api/auth/signup")
def signup(body: SignupBody):
    pw_err = validate_password_strength(body.password)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다")

    user_id = str(uuid.uuid4())
    now = datetime.date.today().isoformat()

    conn.execute(
        """INSERT INTO users (id, name, birth, gender, phone, email, password_hash, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, body.name, body.birth, body.gender, body.phone,
         body.email, hash_password(body.password), now),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()

    return ok({"user": user_schema(dict(row))})


# ── User routes ───────────────────────────────────────────────────────────────

@app.patch("/api/user/profile")
def update_profile(body: UpdateProfileBody, current_user: dict = Depends(get_current_user)):
    fields, params = [], []
    if body.phone is not None:
        fields.append("phone = ?"); params.append(body.phone)
    if body.email is not None:
        # 이메일 중복 확인
        conn = get_db()
        dup = conn.execute(
            "SELECT id FROM users WHERE email = ? AND id != ?", (body.email, current_user["id"])
        ).fetchone()
        conn.close()
        if dup:
            raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다")
        fields.append("email = ?"); params.append(body.email)
    if body.nationality is not None:
        fields.append("nationality = ?"); params.append(body.nationality)
    if body.penName is not None:
        fields.append("pen_name = ?"); params.append(body.penName)

    if not fields:
        return ok(None)

    params.append(current_user["id"])
    conn = get_db()
    conn.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", params)
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (current_user["id"],)).fetchone()
    conn.close()

    u = dict(row)
    return ok(user_schema(u))


MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "GIF", "WEBP"}
FORMAT_EXT = {"JPEG": ".jpg", "PNG": ".png", "GIF": ".gif", "WEBP": ".webp"}

@app.post("/api/user/photo")
async def upload_photo(photo: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    content = await photo.read()

    # 크기 검증
    if len(content) > MAX_PHOTO_SIZE:
        raise HTTPException(status_code=400, detail="사진 크기는 5MB 이하여야 합니다")

    # 실제 이미지 포맷 검증 (magic bytes 기반)
    try:
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(content))
        fmt = img.format
        if fmt not in ALLOWED_IMAGE_FORMATS:
            raise HTTPException(status_code=400, detail="JPG, PNG, GIF, WEBP 형식만 업로드할 수 있습니다")
        img.verify()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="유효하지 않은 이미지 파일입니다")

    ext = FORMAT_EXT.get(fmt, ".jpg")
    filename = f"{current_user['id']}{ext}"
    filepath = os.path.join(PHOTOS_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)
    url = f"/photos/{filename}"
    conn = get_db()
    conn.execute("UPDATE users SET profile_image = ? WHERE id = ?", (url, current_user["id"]))
    conn.commit()
    conn.close()
    return ok({"url": url})


@app.delete("/api/user/photo")
def delete_photo(current_user: dict = Depends(get_current_user)):
    # 파일 삭제
    for ext in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        filepath = os.path.join(PHOTOS_DIR, f"{current_user['id']}{ext}")
        if os.path.exists(filepath):
            os.remove(filepath)
    conn = get_db()
    conn.execute("UPDATE users SET profile_image = '' WHERE id = ?", (current_user["id"],))
    conn.commit()
    conn.close()
    return ok({})


@app.patch("/api/auth/password")
def change_password(body: ChangePasswordBody, current_user: dict = Depends(get_current_user)):
    if not verify_password(body.currentPassword, current_user["password_hash"]):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다")
    pw_err = validate_password_strength(body.newPassword)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)
    conn = get_db()
    conn.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (hash_password(body.newPassword), current_user["id"]),
    )
    conn.commit()
    conn.close()
    return ok(None)


# ── Application routes ────────────────────────────────────────────────────────

@app.get("/api/applications")
def get_applications(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    if current_user["role"] == "admin":
        rows = conn.execute(
            "SELECT a.*, u.name as applicant_name, u.pen_name as applicant_pen_name FROM applications a JOIN users u ON a.user_id = u.id ORDER BY a.apply_date DESC"
        ).fetchall()
        result = []
        for r in rows:
            r = dict(r)
            name = r.pop("applicant_name")
            pen_name = r.pop("applicant_pen_name", "") or ""
            result.append(app_schema(r, name, pen_name))
    else:
        rows = conn.execute(
            """SELECT a.*, u.name as applicant_name, u.pen_name as applicant_pen_name
               FROM applications a
               JOIN users u ON a.user_id = u.id
               WHERE a.user_id = ?
               ORDER BY a.apply_date DESC""",
            (current_user["id"],),
        ).fetchall()
        result = []
        for r in rows:
            r = dict(r)
            name     = r.pop("applicant_name")
            pen_name = r.pop("applicant_pen_name", "") or ""
            result.append(app_schema(r, name, pen_name))
    conn.close()

    return ok(result)


@app.patch("/api/applications/{app_id}/review")
def review_application(
    app_id: str,
    body: ReviewBody,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="관리자만 심사할 수 있습니다")
    if body.status not in ("승인", "반려"):
        raise HTTPException(status_code=422, detail="status는 '승인' 또는 '반려'여야 합니다")
    if body.status == "반려" and not body.reason:
        raise HTTPException(status_code=422, detail="반려 시 사유를 입력해야 합니다")

    conn = get_db()
    row = conn.execute("SELECT apply_no FROM applications WHERE apply_no = ?", (app_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="신청 건을 찾을 수 없습니다")

    now = datetime.date.today().isoformat()
    conn.execute(
        "UPDATE applications SET status = ?, reason = ?, status_date = ? WHERE apply_no = ?",
        (body.status, body.reason, now, app_id),
    )
    conn.commit()
    conn.close()

    return ok({"id": app_id, "status": body.status})


def _kopis_and_ai_blocking(categories, raw_files, user_info) -> dict:
    """블로킹 작업 묶음 — 스레드풀에서 실행됨"""
    external_by_category: dict = {}

    for label, fn, key in [
        ("KOPIS",      kopis_lookup_all, KOPIS_API_KEY),
        ("카카오도서", book_lookup_all,  KAKAO_API_KEY),
    ]:
        if not key:
            continue
        try:
            result = fn(key, categories)
            for cat, entries in result.items():
                if any(e is not None for e in entries):
                    external_by_category.setdefault(cat, [None] * len(entries))
                    for i, e in enumerate(entries):
                        if e is not None:
                            external_by_category[cat][i] = e
            log.debug("[%s 결과]\n%s", label, json.dumps(result, ensure_ascii=False, indent=2))
        except Exception as e:
            log.debug("[%s 오류] %s", label, e)

    try:
        return analyze_full_application(
            ai_client, categories, raw_files, user_info,
            external_by_category=external_by_category or None,
        )
    except Exception as e:
        return {"error": str(e), "is_sufficient": None, "by_category": {}, "all_issues": [], "all_suggestions": []}


async def _run_ai_pipeline(apply_no: str, categories: list, raw_files: dict, user_info: dict):
    """백그라운드: KOPIS + AI를 스레드풀에서 처리 후 DB 업데이트 (이벤트 루프 블로킹 방지)"""
    ai_feedback = await asyncio.to_thread(
        _kopis_and_ai_blocking, categories, raw_files, user_info
    )

    def _save():
        conn = get_db()
        conn.execute(
            "UPDATE applications SET ai_feedback_json = ? WHERE apply_no = ?",
            (json.dumps(ai_feedback, ensure_ascii=False), apply_no),
        )
        conn.commit()
        conn.close()

    await asyncio.to_thread(_save)
    log.debug("[AI 파이프라인 완료] apply_no=%s", apply_no)


@app.get("/api/applications/{app_id}/file")
def download_entry_file(
    app_id: str,
    entry_idx: int,
    slot: str,
    current_user: dict = Depends(get_current_user),
):
    """특정 신청 건의 첨부 파일 다운로드"""
    from fastapi.responses import Response
    import base64 as b64
    conn = get_db()
    row = conn.execute(
        "SELECT entries_json, user_id FROM applications WHERE apply_no = ?", (app_id,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="신청 건을 찾을 수 없습니다")
    if current_user["role"] != "admin" and row["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다")

    entries = json.loads(row["entries_json"])
    if entry_idx < 0 or entry_idx >= len(entries):
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다")

    for f in entries[entry_idx].get("files", []):
        if f.get("slot") == slot:
            mime = f.get("mimeType", "application/octet-stream")
            raw_name = f.get("filename", slot)
            # C16: 파일명 안전 인코딩
            from urllib.parse import quote as _quote
            safe_filename = _quote(raw_name, safe="")
            disposition = f"attachment; filename*=UTF-8''{safe_filename}"

            # 신규: 디스크에서 읽기
            if f.get("path"):
                full_path = os.path.realpath(
                    os.path.join(APPLICATION_FILES_DIR, f["path"])
                )
                # 경로 탈출 방지
                if not full_path.startswith(os.path.realpath(APPLICATION_FILES_DIR)):
                    raise HTTPException(status_code=400, detail="잘못된 파일 경로")
                if not os.path.isfile(full_path):
                    raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
                with open(full_path, "rb") as fp:
                    content = fp.read()
                return Response(content=content, media_type=mime,
                                headers={"Content-Disposition": disposition})

            # 구형: base64 폴백
            data = f.get("data", "")
            if not data:
                raise HTTPException(status_code=404, detail="파일 데이터가 없습니다")
            return Response(content=b64.b64decode(data), media_type=mime,
                            headers={"Content-Disposition": disposition})

    raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")


@app.post("/api/applications")
async def submit_application(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    try:
        form = await request.form()
    except ClientDisconnect:
        raise HTTPException(status_code=499, detail="클라이언트 연결이 끊겼습니다")
    raw_meta = form.get("meta") or form.get("data")
    if not raw_meta:
        raise HTTPException(status_code=422, detail="meta 필드가 없습니다")

    try:
        meta = json.loads(raw_meta)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="meta JSON 파싱 오류")

    import re, mimetypes, secrets

    # apply_no 먼저 생성 (파일 저장 경로에 사용)
    CATEGORY_PREFIX = {
        "문학": "LIT", "일반미술": "FAR", "전통미술": "TAR",
        "디자인 / 공예": "DES", "사진": "PHO", "만화": "COM",
        "영화": "FLM", "방송": "BRD", "공연": "PFM", "연극": "THE",
        "무용": "DAN", "국악": "KMU", "대중음악": "POP", "일반음악": "MUS",
    }
    cat_names = [c["name"] for c in meta.get("categories", [])]
    prefix   = CATEGORY_PREFIX.get(cat_names[0], "ART") if len(cat_names) == 1 else "MIX"
    apply_no = f"{prefix}-{datetime.date.today().strftime('%Y%m%d')}-{secrets.token_hex(2).upper()}"
    now      = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # entries 정리
    entries = []
    for cat in meta.get("categories", []):
        cat_name = cat["name"]
        for entry in cat.get("entries", []):
            entry_dict = {k: v for k, v in entry.items() if v}
            entry_dict["category"]    = cat_name
            entry_dict["entryStatus"] = "심사중"
            entry_dict["entryReason"] = None
            entries.append(entry_dict)

    # 업로드 파일 수집 + 크기 검사 + 디스크 저장
    app_files_dir = os.path.join(APPLICATION_FILES_DIR, apply_no)
    FILE_SLOT_LABELS = {
        "workImage": "작품 이미지", "detailPage1": "상세 페이지 1",
        "detailPage2": "상세 페이지 2", "income": "수익 증빙", "other": "기타 서류",
    }
    raw_files: dict[str, tuple[bytes, str]] = {}
    cat_entry_files: dict[str, dict[int, list]] = {}

    for key, value in form.multi_items():
        if key in ("meta", "data"):
            continue
        if not hasattr(value, "read"):
            continue
        file_bytes = await value.read()
        if not file_bytes:
            continue

        # 크기 제한
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"파일 크기는 10MB 이하여야 합니다 ({value.filename})",
            )

        raw_files[key] = (file_bytes, value.filename or key)

        m = re.match(r"^(.+)\[(\d+)\]\.(\w+)$", key)
        if not m:
            continue
        cat_name, idx, slot = m.group(1), int(m.group(2)), m.group(3)
        orig_name = value.filename or f"{slot}.bin"
        safe_name = re.sub(r"[^\w.\-]", "_", orig_name)
        file_key  = f"{slot}_{safe_name}"
        mime      = mimetypes.guess_type(orig_name)[0] or "application/octet-stream"

        # 디스크에 저장
        os.makedirs(app_files_dir, exist_ok=True)
        with open(os.path.join(app_files_dir, file_key), "wb") as fp:
            fp.write(file_bytes)

        cat_entry_files.setdefault(cat_name, {}).setdefault(idx, []).append({
            "slot":     slot,
            "label":    FILE_SLOT_LABELS.get(slot, slot),
            "filename": orig_name,
            "mimeType": mime,
            "path":     f"{apply_no}/{file_key}",   # base64 대신 경로 저장
        })

    cat_idx_counter: dict[str, int] = {}
    for entry in entries:
        cat = entry["category"]
        idx = cat_idx_counter.get(cat, 0)
        cat_idx_counter[cat] = idx + 1
        entry["files"] = cat_entry_files.get(cat, {}).get(idx, [])

    conn = get_db()
    conn.execute(
        """INSERT INTO applications
               (id, apply_no, user_id, type, status, status_date, apply_date, entries_json, ai_feedback_json)
           VALUES (?, ?, ?, ?, '심사중', ?, ?, ?, NULL)""",
        (apply_no, apply_no, current_user["id"],
         meta.get("type", "일반 유형 · 단일 분야"),
         now, now,
         json.dumps(entries, ensure_ascii=False)),
    )
    conn.commit()
    conn.close()

    # KOPIS + AI를 백그라운드에서 처리
    background_tasks.add_task(
        _run_ai_pipeline,
        apply_no,
        meta.get("categories", []),
        raw_files,
        {
            "name":   current_user.get("name"),
            "birth":  current_user.get("birth"),
            "gender": current_user.get("gender"),
        },
    )

    return ok({"applyNo": apply_no})


# ── 임시저장 API ─────────────────────────────────────────────────────────────

@app.get("/api/drafts")
def get_draft(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute(
        "SELECT saved_at, data_json FROM drafts WHERE user_id = ?",
        (current_user["id"],),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="임시저장 없음")
    data = json.loads(row["data_json"])
    return ok({"savedAt": row["saved_at"], **data})


@app.post("/api/drafts")
async def save_draft_api(request: Request, current_user: dict = Depends(get_current_user)):
    import re as _re, mimetypes as _mimetypes, shutil as _shutil

    try:
        form = await request.form()
    except ClientDisconnect:
        raise HTTPException(status_code=499, detail="클라이언트 연결이 끊겼습니다")

    raw_data = form.get("data")
    if not raw_data:
        raise HTTPException(status_code=422, detail="data 필드가 없습니다")
    try:
        data = json.loads(raw_data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="data JSON 파싱 오류")

    # 기존 임시저장 파일 삭제
    user_draft_dir = os.path.join(DRAFT_FILES_DIR, current_user["id"])
    if os.path.isdir(user_draft_dir):
        _shutil.rmtree(user_draft_dir)
    os.makedirs(user_draft_dir, exist_ok=True)

    # 업로드된 파일 처리 (key: "{cat}[{idx}].{slot}")
    file_infos = []
    for key, value in form.multi_items():
        if key == "data":
            continue
        if not hasattr(value, "read"):
            continue
        file_bytes = await value.read()
        if not file_bytes:
            continue
        m = _re.match(r"^(.+)\[(\d+)\]\.(\w+)$", key)
        if not m:
            continue
        cat_name, idx, slot = m.group(1), int(m.group(2)), m.group(3)
        safe_name = _re.sub(r"[^\w.\-]", "_", value.filename or f"{slot}.bin")
        file_key = f"{cat_name}_{idx}_{slot}_{safe_name}"
        file_path = os.path.join(user_draft_dir, file_key)
        with open(file_path, "wb") as fp:
            fp.write(file_bytes)
        mime = _mimetypes.guess_type(value.filename or safe_name)[0] or "application/octet-stream"
        file_infos.append({
            "cat": cat_name, "idx": idx, "slot": slot,
            "filename": value.filename or safe_name,
            "mimeType": mime,
            "url": f"/draft-files/{current_user['id']}/{file_key}",
        })

    data_json = json.dumps({**data, "fileInfos": file_infos}, ensure_ascii=False)
    now = datetime.datetime.now().isoformat()

    conn = get_db()
    conn.execute(
        """INSERT INTO drafts (user_id, saved_at, data_json) VALUES (?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET saved_at = excluded.saved_at, data_json = excluded.data_json""",
        (current_user["id"], now, data_json),
    )
    conn.commit()
    conn.close()

    return ok({"savedAt": now, "fileInfos": file_infos})


@app.delete("/api/drafts")
def delete_draft_api(current_user: dict = Depends(get_current_user)):
    import shutil as _shutil
    user_draft_dir = os.path.join(DRAFT_FILES_DIR, current_user["id"])
    if os.path.isdir(user_draft_dir):
        _shutil.rmtree(user_draft_dir)
    conn = get_db()
    conn.execute("DELETE FROM drafts WHERE user_id = ?", (current_user["id"],))
    conn.commit()
    conn.close()
    return ok({})


# ── 프로필 사진 정적 파일 서빙 ────────────────────────────────────────────────
app.mount("/photos", StaticFiles(directory=PHOTOS_DIR), name="photos")

# ── 임시저장 파일 정적 서빙 ──────────────────────────────────────────────────
app.mount("/draft-files", StaticFiles(directory=DRAFT_FILES_DIR), name="draft-files")

# ── 프론트엔드 정적 파일 서빙 (빌드된 dist/) ─────────────────────────────────
_dist = os.path.join(os.path.dirname(__file__), "../2026-oss-project/dist")
if os.path.isdir(_dist):
    # Vite 빌드 결과물의 JS/CSS/이미지 등 정적 에셋
    app.mount("/assets", StaticFiles(directory=os.path.join(_dist, "assets")), name="static-assets")

from fastapi.responses import FileResponse as _FileResponse

@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    """SPA 히스토리 라우팅 — /apply, /status 등 모든 경로에서 index.html 반환.
    dist/ 안에 실제 파일(favicon, 프로필 이미지 등)이 있으면 그 파일을 우선 서빙."""
    candidate = os.path.join(_dist, full_path)
    if os.path.isfile(candidate):
        return _FileResponse(candidate)
    return _FileResponse(os.path.join(_dist, "index.html"))
