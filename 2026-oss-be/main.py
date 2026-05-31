import sqlite3
import json
import uuid
import hashlib
import datetime
import os
from typing import Optional

import jwt
import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from ai_review import analyze_full_application

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=True)

app = FastAPI(title="ArtPass API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "artpass-demo-secret-key"
ALGORITHM = "HS256"
DB_PATH = "artpass.db"

ALLOWED_CATEGORIES = {"문학", "연극"}

ai_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


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
    conn.close()


init_db()


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
        "name":        u["name"],
        "birth":       u["birth"],
        "gender":      u["gender"],
        "phone":       u["phone"],
        "email":       u["email"],
        "nationality": u["nationality"],
        "penName":     u["pen_name"],
        "role":        u["role"],
    }


def app_schema(a: dict, applicant_name: str) -> dict:
    entries = json.loads(a["entries_json"])
    categories = list(dict.fromkeys(e["category"] for e in entries))
    ai_feedback = json.loads(a["ai_feedback_json"]) if a.get("ai_feedback_json") else None
    return {
        "id":            a["id"],
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
    row = conn.execute("SELECT id FROM applications WHERE id = ?", (app_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="신청 건을 찾을 수 없습니다")

    now = datetime.date.today().isoformat()
    conn.execute(
        "UPDATE applications SET status = ?, reason = ?, status_date = ? WHERE id = ?",
        (body.status, body.reason, now, app_id),
    )
    conn.commit()
    conn.close()

    return ok({"id": app_id, "status": body.status})


@app.post("/api/applications")
async def submit_application(request: Request, current_user: dict = Depends(get_current_user)):
    form = await request.form()
    raw_meta = form.get("meta")
    if not raw_meta:
        raise HTTPException(status_code=422, detail="meta 필드가 없습니다")

    try:
        meta = json.loads(raw_meta)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="meta JSON 파싱 오류")

    # 허용된 카테고리 검증 및 entries 정리
    entries = []
    for cat in meta.get("categories", []):
        cat_name = cat["name"]
        if cat_name not in ALLOWED_CATEGORIES:
            raise HTTPException(status_code=400, detail=f"지원하지 않는 분야입니다: {cat_name}")

        for entry in cat.get("entries", []):
            entry_dict = {k: v for k, v in entry.items() if v}
            entry_dict["category"]    = cat_name
            entry_dict["entryStatus"] = "심사중"
            entry_dict["entryReason"] = None
            entries.append(entry_dict)

    # 업로드 파일 수집 및 파싱 (key 형식: "{category}[{index}].{slot}")
    import re, base64, mimetypes
    raw_files: dict[str, tuple[bytes, str]] = {}
    for key, value in form.multi_items():
        if key == "meta":
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

    # 분야별 entry index 재산출 후 files 붙이기
    cat_idx_counter: dict[str, int] = {}
    for entry in entries:
        cat = entry["category"]
        idx = cat_idx_counter.get(cat, 0)
        cat_idx_counter[cat] = idx + 1
        entry["files"] = cat_entry_files.get(cat, {}).get(idx, [])

    # AI 분석 (제출 시점에 실행)
    ai_feedback = None
    try:
        ai_feedback = analyze_full_application(ai_client, meta.get("categories", []), raw_files)
    except Exception as e:
        ai_feedback = {"error": str(e), "is_sufficient": None, "by_category": {}, "all_issues": [], "all_suggestions": []}

    app_id   = str(uuid.uuid4())
    apply_no = f"ART-{datetime.date.today().strftime('%Y%m%d')}-{app_id[:4].upper()}"
    now      = datetime.date.today().isoformat()

    conn = get_db()
    conn.execute(
        """INSERT INTO applications
               (id, apply_no, user_id, type, status, status_date, apply_date, entries_json, ai_feedback_json)
           VALUES (?, ?, ?, ?, '심사중', ?, ?, ?, ?)""",
        (app_id, apply_no, current_user["id"],
         meta.get("type", "일반 유형 · 단일 분야"),
         now, now,
         json.dumps(entries, ensure_ascii=False),
         json.dumps(ai_feedback, ensure_ascii=False)),
    )
    conn.commit()
    conn.close()

    return ok({"id": app_id, "aiFeedback": ai_feedback})
