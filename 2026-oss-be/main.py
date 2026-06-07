import sqlite3
import json
import uuid
import hashlib
import datetime
import os
import logging
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
from starlette.requests import ClientDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from ai_review import analyze_full_application
from kopis import lookup_all_entries

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=True)

app = FastAPI(title="ArtPass API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://140.245.73.203:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "artpass-demo-secret-key"
ALGORITHM = "HS256"
DB_PATH = "artpass.db"


ai_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
KOPIS_API_KEY = os.environ.get("KOPIS_API_KEY", "")


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


# ── Auth helpers ──────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


security = HTTPBearer()


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
            "phone": "01011112222", "email": "demo2@artpass.kr",
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
        exists = conn.execute("SELECT id FROM users WHERE email = ?", (a["email"],)).fetchone()
        if not exists:
            conn.execute(
                """INSERT INTO users (id, name, birth, gender, phone, email, password_hash, role, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (a["id"], a["name"], a["birth"], a["gender"], a["phone"],
                 a["email"], hash_password(a["password"]), a["role"],
                 datetime.date.today().isoformat()),
            )
    conn.commit()
    conn.close()


seed_accounts()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
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


def app_schema(a: dict, applicant_name: str) -> dict:
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
        "applicantName": applicant_name,
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
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone()
    conn.close()

    if not row or row["password_hash"] != hash_password(body.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다")

    user = dict(row)
    token = create_token(user["id"])
    return ok({"user": user_schema(user), "token": token})


@app.post("/api/auth/logout")
def logout():
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


@app.post("/api/user/photo")
async def upload_photo(photo: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # 확장자 검증
    ext = os.path.splitext(photo.filename or "")[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
        ext = ".jpg"
    filename = f"{current_user['id']}{ext}"
    filepath = os.path.join(PHOTOS_DIR, filename)
    content = await photo.read()
    with open(filepath, "wb") as f:
        f.write(content)
    url = f"/photos/{filename}"
    conn = get_db()
    conn.execute("UPDATE users SET profile_image = ? WHERE id = ?", (url, current_user["id"]))
    conn.commit()
    conn.close()
    return ok({"url": url})


@app.patch("/api/auth/password")
def change_password(body: ChangePasswordBody, current_user: dict = Depends(get_current_user)):
    if current_user["password_hash"] != hash_password(body.currentPassword):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다")
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
            "SELECT a.*, u.name as applicant_name FROM applications a JOIN users u ON a.user_id = u.id ORDER BY a.apply_date DESC"
        ).fetchall()
        result = []
        for r in rows:
            r = dict(r)
            name = r.pop("applicant_name")
            result.append(app_schema(r, name))
    else:
        rows = conn.execute(
            "SELECT * FROM applications WHERE user_id = ? ORDER BY apply_date DESC",
            (current_user["id"],),
        ).fetchall()
        result = [app_schema(dict(r), current_user["name"]) for r in rows]
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


def _run_ai_pipeline(apply_no: str, categories: list, raw_files: dict, user_info: dict):
    """백그라운드: KOPIS + AI 처리 후 DB 업데이트"""
    kopis_by_category: dict = {}
    try:
        kopis_by_category = lookup_all_entries(KOPIS_API_KEY, categories)
        log.debug("[KOPIS 결과]\n%s", json.dumps(kopis_by_category, ensure_ascii=False, indent=2))
    except Exception as e:
        log.debug("[KOPIS 오류] %s", e)

    try:
        ai_feedback = analyze_full_application(
            ai_client, categories, raw_files, user_info,
            kopis_by_category=kopis_by_category or None,
        )
    except Exception as e:
        ai_feedback = {"error": str(e), "is_sufficient": None, "by_category": {}, "all_issues": [], "all_suggestions": []}

    conn = get_db()
    conn.execute(
        "UPDATE applications SET ai_feedback_json = ? WHERE apply_no = ?",
        (json.dumps(ai_feedback, ensure_ascii=False), apply_no),
    )
    conn.commit()
    conn.close()
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
            data = f.get("data", "")
            if not data:
                raise HTTPException(status_code=404, detail="파일 데이터가 없습니다")
            mime = f.get("mimeType", "application/octet-stream")
            filename = f.get("filename", slot)
            return Response(
                content=b64.b64decode(data),
                media_type=mime,
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
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

    # 업로드 파일 수집 (key: "{category}[{index}].{slot}")
    import re, base64, mimetypes
    raw_files: dict[str, tuple[bytes, str]] = {}
    for key, value in form.multi_items():
        if key in ("meta", "data"):
            continue
        if hasattr(value, "read"):
            file_bytes = await value.read()
            if file_bytes:
                raw_files[key] = (file_bytes, value.filename or key)

    FILE_SLOT_LABELS = {
        "workImage": "작품 이미지", "detailPage1": "상세 페이지 1",
        "detailPage2": "상세 페이지 2", "income": "수익 증빙", "other": "기타 서류",
    }
    # entries에 files 삽입
    cat_entry_files: dict[str, dict[int, list]] = {}
    for key, (file_bytes, filename) in raw_files.items():
        m = re.match(r"^(.+)\[(\d+)\]\.(\w+)$", key)
        if not m:
            continue
        cat_name, idx, slot = m.group(1), int(m.group(2)), m.group(3)
        mime = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        cat_entry_files.setdefault(cat_name, {}).setdefault(idx, []).append({
            "slot":     slot,
            "label":    FILE_SLOT_LABELS.get(slot, slot),
            "filename": filename,
            "mimeType": mime,
            "data":     base64.standard_b64encode(file_bytes).decode(),
        })

    cat_idx_counter: dict[str, int] = {}
    for entry in entries:
        cat = entry["category"]
        idx = cat_idx_counter.get(cat, 0)
        cat_idx_counter[cat] = idx + 1
        entry["files"] = cat_entry_files.get(cat, {}).get(idx, [])

    # DB에 즉시 저장 (ai_feedback_json 은 NULL — 백그라운드에서 채워짐)
    import secrets
    CATEGORY_PREFIX = {
        "문학":        "LIT",
        "일반미술":    "FAR",
        "전통미술":    "TAR",
        "디자인 / 공예": "DES",
        "사진":        "PHO",
        "만화":        "COM",
        "영화":        "FLM",
        "방송":        "BRD",
        "공연":        "PFM",
        "연극":        "THE",
        "무용":        "DAN",
        "국악":        "KMU",
        "대중음악":    "POP",
        "일반음악":    "MUS",
    }
    cat_names = [c["name"] for c in categories]
    prefix = CATEGORY_PREFIX.get(cat_names[0], "ART") if len(cat_names) == 1 else "MIX"
    suffix = secrets.token_hex(2).upper()  # 랜덤 4자리 16진수
    apply_no = f"{prefix}-{datetime.date.today().strftime('%Y%m%d')}-{suffix}"
    now      = datetime.date.today().isoformat()

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


# ── 프로필 사진 정적 파일 서빙 ────────────────────────────────────────────────
app.mount("/photos", StaticFiles(directory=PHOTOS_DIR), name="photos")

# ── 프론트엔드 정적 파일 서빙 (빌드된 dist/) ─────────────────────────────────
_dist = os.path.join(os.path.dirname(__file__), "../2026-oss-project/dist")
if os.path.isdir(_dist):
    app.mount("/", StaticFiles(directory=_dist, html=True), name="static")
