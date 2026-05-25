from sqlalchemy import Column, DateTime, Float, Integer, JSON, LargeBinary, String
from sqlalchemy.sql import func
from back.database import Base


class DocumentSchema(Base):
    __tablename__ = "document_schemas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    # [{"name": str, "type": str}]
    fields = Column(JSON, nullable=False)
    # 텍스트 임베딩 벡터 (768-dim float list) — 코사인 유사도 스키마 매칭용
    text_embedding = Column(JSON, nullable=True)
    # 관리자가 업로드한 모범 문서 JPG 원본
    source_image = Column(LargeBinary, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SubmittedDocument(Base):
    __tablename__ = "submitted_documents"

    id = Column(Integer, primary_key=True, index=True)
    schema_id = Column(Integer, nullable=False)
    # 사용자가 제출한 JPG 원본
    image = Column(LargeBinary, nullable=False)
    extracted_data = Column(JSON, nullable=False)
    missing_fields = Column(JSON, nullable=False, default=list)
    similarity_score = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
