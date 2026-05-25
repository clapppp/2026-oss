import json

from ai.llm.prompt import ADMIN_EXTRACT_PROMPT, ADMIN_CLEAN_FIELDS_PROMPT
from ai.models import get_text_embedder, generate_with_retry
from ai.ocr.reader import ocr_and_correct
from ai.utils.image import bytes_to_image
from back.schemas.pydantic import FieldDefinition


class AdminPipeline:
    """
    모범 문서 → 한국어 텍스트 임베딩 + 필드 스키마 추출 파이프라인.

    - KoreanTextEmbedder: OCR 텍스트 → 768-dim 임베딩 → DB 저장 (유저 문서와 코사인 유사도 비교용)
    - OCR: 텍스트 추출 → LLM 입력
    - LLM: 필드 목록 자동 추출 → 필드명 정제
    """

    def __init__(self, **kwargs):
        pass

    def extract_schema(self, image_bytes: bytes) -> tuple[list[FieldDefinition], list[float]]:
        """모범 문서에서 필드 목록과 텍스트 임베딩을 추출한다."""
        image = bytes_to_image(image_bytes)
        image, ocr_text = ocr_and_correct(image)
        embedding = get_text_embedder().get_embedding(ocr_text)

        # 1차: 필드 추출
        prompt = ADMIN_EXTRACT_PROMPT.format(ocr_text=ocr_text)
        data = generate_with_retry(prompt)
        raw_fields = data.get("fields", [])

        # 2차: LLM이 필드명 정제 (OCR 노이즈 제거)
        fields_json = json.dumps(raw_fields, ensure_ascii=False)
        clean_prompt = ADMIN_CLEAN_FIELDS_PROMPT.format(fields_json=fields_json)
        clean_data = generate_with_retry(clean_prompt)
        fields = [FieldDefinition(**f) for f in clean_data.get("fields", raw_fields)]

        return fields, embedding
