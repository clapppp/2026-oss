import json
import torch
import torch.nn.functional as F
from fastapi import HTTPException

from ai.llm.prompt import USER_EVALUATE_PROMPT
from ai.models import get_text_embedder, generate_with_retry
from ai.ocr.reader import ocr_and_correct
from ai.utils.image import bytes_to_image
from back.schemas.pydantic import DocumentSubmitResponse, FieldDefinition, TopKScore


class UserPipeline:
    """
    사용자 문서 → 스키마 선택 → 필드 추출 파이프라인.

    스키마 선택: 한국어 텍스트 임베딩 코사인 유사도 Top-3 후보 → LLM 최종 선택
    필드 추출: PaddleOCR → LLM (Qwen2.5-7B)
    """

    def __init__(self, **kwargs):
        pass

    def _score_all_schemas(self, user_emb: torch.Tensor, schemas: list):
        """텍스트 임베딩 코사인 유사도 전체 스키마 점수 반환. [(score, schema), ...] 내림차순"""
        scored = []

        for schema in schemas:
            if not schema.text_embedding:
                continue
            schema_emb = torch.tensor(schema.text_embedding, dtype=torch.float32)
            score = F.cosine_similarity(
                user_emb.unsqueeze(0), schema_emb.unsqueeze(0)
            ).item()
            scored.append((score, schema))

        scored.sort(key=lambda x: x[0], reverse=True)
        return scored

    def evaluate(self, image_bytes: bytes, schemas: list) -> DocumentSubmitResponse:
        if not schemas:
            raise HTTPException(status_code=404, detail="등록된 스키마가 없습니다")

        image = bytes_to_image(image_bytes)
        image, ocr_text = ocr_and_correct(image)

        # 1. 텍스트 임베딩 → 전체 유사도 계산 → Top-3 후보 추출
        user_emb = torch.tensor(
            get_text_embedder().get_embedding(ocr_text), dtype=torch.float32
        )
        all_scored = self._score_all_schemas(user_emb, schemas)
        top_k = all_scored[:3] if all_scored else [(0.0, s) for s in schemas[:3]]

        # 2. LLM 최종 스키마 선택 + 필드 추출
        schemas_text = json.dumps(
            [{"id": s.id, "name": s.name, "fields": s.fields} for _, s in top_k],
            ensure_ascii=False,
        )
        prompt = USER_EVALUATE_PROMPT.format(ocr_text=ocr_text, schemas=schemas_text)
        parsed = generate_with_retry(prompt)

        selected_id = parsed.get("schema_id")
        selected = next((s for _, s in top_k if s.id == selected_id), top_k[0][1])
        similarity = next((sc for sc, s in top_k if s.id == selected.id), top_k[0][0])
        extracted = parsed.get("fields", {})

        # 3. 누락 필드 리포트
        try:
            fields_def = [FieldDefinition(**f) for f in selected.fields]
        except (TypeError, ValueError) as e:
            raise HTTPException(status_code=500, detail=f"스키마 형식 오류: {e}")

        missing = [f.name for f in fields_def if not extracted.get(f.name)]

        return DocumentSubmitResponse(
            schema_id=selected.id,
            schema_name=selected.name,
            similarity_score=round(similarity, 4),
            top_k_scores=[
                TopKScore(schema_id=s.id, schema_name=s.name, score=round(sc, 4))
                for sc, s in top_k
            ],
            all_scores=[
                TopKScore(schema_id=s.id, schema_name=s.name, score=round(sc, 4))
                for sc, s in all_scored
            ],
            data=extracted,
            missing_fields=missing,
        )
