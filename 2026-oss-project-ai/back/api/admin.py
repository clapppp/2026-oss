import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from back.database import get_db
from back.models.schema import DocumentSchema, SubmittedDocument
from back.schemas.pydantic import DocumentRecord, ExtractedSchema, SchemaCreate, SchemaResponse

router = APIRouter()

# extract-schema 호출 시 임베딩과 이미지를 임시 보관 (extract_id → {"embedding": [...], "image": bytes})
_pending_data: dict[str, dict] = {}


def get_admin_pipeline():
    from ai.pipeline.admin import AdminPipeline
    return AdminPipeline()


@router.post("/extract-schema", response_model=ExtractedSchema)
async def extract_schema(file: UploadFile = File(...)):
    """모범 문서 JPG를 받아 필드 목록을 자동 추출. 텍스트 임베딩과 이미지는 서버에 임시 보관."""
    image_bytes = await file.read()

    pipeline = get_admin_pipeline()
    try:
        fields, text_embedding = pipeline.extract_schema(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    extract_id = str(uuid.uuid4())
    _pending_data[extract_id] = {"embedding": text_embedding, "image": image_bytes}

    return ExtractedSchema(extract_id=extract_id, fields=fields)


@router.post("/schema", response_model=SchemaResponse)
def save_schema(schema: SchemaCreate, db: Session = Depends(get_db)):
    """관리자가 선택한 필드 구조를 스키마로 저장. 텍스트 임베딩과 이미지는 extract_id로 참조."""
    pending = _pending_data.pop(schema.extract_id, None)
    if pending is None:
        raise HTTPException(status_code=400, detail="유효하지 않은 extract_id입니다. 먼저 /extract-schema를 호출하세요.")

    db_schema = DocumentSchema(
        name=schema.name,
        fields=[f.model_dump() for f in schema.fields],
        text_embedding=pending["embedding"],
        source_image=pending["image"],
    )
    db.add(db_schema)
    db.commit()
    db.refresh(db_schema)
    return SchemaResponse(id=db_schema.id, name=db_schema.name, fields=schema.fields)


@router.get("/schemas", response_model=list[SchemaResponse])
def list_schemas(db: Session = Depends(get_db)):
    """등록된 스키마 목록 조회."""
    rows = db.query(DocumentSchema).all()
    return [SchemaResponse(id=r.id, name=r.name, fields=r.fields) for r in rows]


@router.get("/schema/{schema_id}/image")
def get_schema_image(schema_id: int, db: Session = Depends(get_db)):
    """스키마 등록 시 업로드한 모범 문서 이미지 조회."""
    row = db.query(DocumentSchema).filter(DocumentSchema.id == schema_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="스키마를 찾을 수 없습니다")
    if not row.source_image:
        raise HTTPException(status_code=404, detail="저장된 이미지가 없습니다")
    return Response(
        content=row.source_image,
        media_type="image/jpeg",
        headers={"Content-Disposition": f"inline; filename=schema_{schema_id}.jpg"},
    )


@router.get("/documents/search", response_model=list[DocumentRecord])
def search_documents(q: str, db: Session = Depends(get_db)):
    """키워드로 전체 제출 문서 검색. extracted_data 필드값 대상."""
    from sqlalchemy import cast, String

    rows = (
        db.query(SubmittedDocument)
        .filter(cast(SubmittedDocument.extracted_data, String).ilike(f"%{q}%"))
        .all()
    )

    schema_ids = {r.schema_id for r in rows}
    schemas = {
        s.id: s.name
        for s in db.query(DocumentSchema).filter(DocumentSchema.id.in_(schema_ids)).all()
    }

    return [
        DocumentRecord(
            id=r.id,
            schema_id=r.schema_id,
            schema_name=schemas.get(r.schema_id, ""),
            similarity_score=r.similarity_score,
            extracted_data=r.extracted_data,
            missing_fields=r.missing_fields,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.get("/schema/{schema_id}/documents", response_model=list[DocumentRecord])
def list_documents_by_schema(schema_id: int, db: Session = Depends(get_db)):
    """스키마별 제출 문서 목록 조회."""
    schema = db.query(DocumentSchema).filter(DocumentSchema.id == schema_id).first()
    if not schema:
        raise HTTPException(status_code=404, detail="스키마를 찾을 수 없습니다")

    rows = db.query(SubmittedDocument).filter(
        SubmittedDocument.schema_id == schema_id
    ).all()

    return [
        DocumentRecord(
            id=r.id,
            schema_id=r.schema_id,
            schema_name=schema.name,
            similarity_score=r.similarity_score,
            extracted_data=r.extracted_data,
            missing_fields=r.missing_fields,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.get("/schema/{schema_id}/documents/{doc_id}/image")
def get_document_image(schema_id: int, doc_id: int, db: Session = Depends(get_db)):
    """제출된 문서 이미지 조회."""
    row = db.query(SubmittedDocument).filter(
        SubmittedDocument.id == doc_id,
        SubmittedDocument.schema_id == schema_id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다")
    return Response(
        content=row.image,
        media_type="image/jpeg",
        headers={"Content-Disposition": f"inline; filename=document_{doc_id}.jpg"},
    )


@router.delete("/schema/{schema_id}")
def delete_schema(schema_id: int, db: Session = Depends(get_db)):
    """스키마 삭제."""
    row = db.query(DocumentSchema).filter(DocumentSchema.id == schema_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="스키마를 찾을 수 없습니다")
    db.delete(row)
    db.commit()
    return {"detail": "삭제 완료"}
