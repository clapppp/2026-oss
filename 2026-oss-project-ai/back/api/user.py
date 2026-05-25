from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from back.database import get_db
from back.models.schema import DocumentSchema, SubmittedDocument
from back.schemas.pydantic import DocumentSubmitResponse

router = APIRouter()

_pipeline = None


def get_user_pipeline():
    global _pipeline
    if _pipeline is None:
        from ai.pipeline.user import UserPipeline
        _pipeline = UserPipeline()
    return _pipeline


@router.post("/submit", response_model=DocumentSubmitResponse)
async def submit_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """문서 JPG를 제출받아 스키마 매칭 + 필드 추출 결과를 반환하고 DB에 저장."""
    image_bytes = await file.read()

    schemas = db.query(DocumentSchema).all()
    if not schemas:
        raise HTTPException(status_code=404, detail="등록된 스키마가 없습니다")

    try:
        result = get_user_pipeline().evaluate(image_bytes, schemas)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db.add(SubmittedDocument(
        schema_id=result.schema_id,
        image=image_bytes,
        extracted_data=result.data,
        missing_fields=result.missing_fields,
        similarity_score=result.similarity_score,
    ))
    db.commit()

    return result
