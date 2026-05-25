from contextlib import asynccontextmanager
from fastapi import FastAPI
from back.api import admin, user
from back.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    from ai.models import get_text_embedder, get_llm
    from ai.ocr.reader import get_ocr
    get_text_embedder()
    get_llm()
    get_ocr()
    yield


app = FastAPI(
    title="AI 문서 판별 프레임워크",
    description="모범 문서 기반 스키마 추출 · 문서 분류 · 필드 자동 추출 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(user.router, prefix="/user", tags=["user"])


@app.get("/health")
def health():
    return {"status": "ok"}
