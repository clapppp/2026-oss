import json

import torch
import torch.nn.functional as F
from fastapi import HTTPException

from ai.llm.prompt import VLM_ADMIN_EXTRACT_PROMPT, VLM_USER_EVALUATE_PROMPT
from ai.models import get_text_embedder, get_vlm, parse_llm_json
from ai.ocr.reader import ocr_and_correct
from ai.utils.image import bytes_to_image
from back.schemas.pydantic import DocumentSubmitResponse, FieldDefinition, TopKScore


def _vlm_generate_with_retry(image, prompt: str, max_new_tokens: int = 1024) -> dict:
    raw = get_vlm().generate(image, prompt, max_new_tokens=max_new_tokens)
    try:
        return parse_llm_json(raw)
    except ValueError:
        raw2 = get_vlm().generate(image, prompt, max_new_tokens=min(max_new_tokens * 2, 4096))
        return parse_llm_json(raw2)


class VLMAdminPipeline:
    """
    모범 문서 이미지 → VLM 직접 필드 추출 + OCR 텍스트 임베딩 저장.
    OCR은 스키마 매칭용 임베딩 생성에만 사용하고, 필드 추출은 VLM이 담당한다.
    """

    def extract_schema(self, image_bytes: bytes) -> tuple[list[FieldDefinition], list[float]]:
        image = bytes_to_image(image_bytes)

        # OCR: 임베딩용 텍스트만 추출 (필드 추출엔 사용 안 함)
        _, ocr_text = ocr_and_correct(image)
        embedding = get_text_embedder().get_embedding(ocr_text)

        # VLM: 이미지 직접 분석 → 필드 추출
        data = _vlm_generate_with_retry(image, VLM_ADMIN_EXTRACT_PROMPT)
        fields = [FieldDefinition(**f) for f in data.get("fields", [])]

        return fields, embedding


class VLMUserPipeline:
    """
    사용자 문서 → OCR 임베딩으로 스키마 매칭 → VLM으로 필드 추출.
    """

    def _score_all_schemas(self, user_emb: torch.Tensor, schemas: list):
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
        _, ocr_text = ocr_and_correct(image)

        user_emb = torch.tensor(
            get_text_embedder().get_embedding(ocr_text), dtype=torch.float32
        )
        all_scored = self._score_all_schemas(user_emb, schemas)
        top_k = all_scored[:3] if all_scored else [(0.0, s) for s in schemas[:3]]

        schemas_text = json.dumps(
            [{"id": s.id, "name": s.name, "fields": s.fields} for _, s in top_k],
            ensure_ascii=False,
        )
        prompt = VLM_USER_EVALUATE_PROMPT.format(schemas=schemas_text)
        parsed = _vlm_generate_with_retry(image, prompt)

        selected_id = parsed.get("schema_id")
        selected = next((s for _, s in top_k if s.id == selected_id), top_k[0][1])
        similarity = next((sc for sc, s in top_k if s.id == selected.id), top_k[0][0])
        extracted = parsed.get("fields", {})

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
