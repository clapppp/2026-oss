from __future__ import annotations

from typing import Any
from pydantic import BaseModel


class FieldDefinition(BaseModel):
    name: str
    type: str  # "string" | "number" | "date" | "array"


class SchemaCreate(BaseModel):
    name: str
    fields: list[FieldDefinition]
    extract_id: str  # extract-schema 호출 시 발급된 임시 ID


class SchemaResponse(BaseModel):
    id: int
    name: str
    fields: list[FieldDefinition]


class ExtractedSchema(BaseModel):
    extract_id: str  # 임시 ID — schema 저장 시 전달
    fields: list[FieldDefinition]


class TopKScore(BaseModel):
    schema_id: int
    schema_name: str
    score: float


class DocumentSubmitResponse(BaseModel):
    schema_id: int
    schema_name: str
    similarity_score: float
    top_k_scores: list[TopKScore]
    all_scores: list[TopKScore]
    data: dict[str, Any]
    missing_fields: list[str]


class DocumentRecord(BaseModel):
    id: int
    schema_id: int
    schema_name: str
    similarity_score: float
    extracted_data: dict[str, Any]
    missing_fields: list[str]
    created_at: str
