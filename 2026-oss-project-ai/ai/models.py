"""
텍스트 임베더 / LLM 공유 싱글톤 + LLM 응답 파싱 유틸.
admin, user 파이프라인이 동일 인스턴스를 재사용한다.
"""

import json

_text_embedder = None
_llm = None


def get_text_embedder():
    global _text_embedder
    if _text_embedder is None:
        from ai.embedding.text import KoreanTextEmbedder
        _text_embedder = KoreanTextEmbedder()
    return _text_embedder


def get_llm():
    global _llm
    if _llm is None:
        from ai.llm.model import DocumentLLM
        _llm = DocumentLLM()
    return _llm


def parse_llm_json(raw: str) -> dict:
    """LLM 응답 문자열에서 JSON 객체를 추출한다. 문법 오류는 자동 보정."""
    from json_repair import repair_json
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError(f"LLM 출력에서 JSON을 찾을 수 없습니다: {raw[:200]}")
    return json.loads(repair_json(raw[start:end]))


def generate_with_retry(prompt: str, max_new_tokens: int = 1024) -> dict:
    """LLM 생성 + JSON 파싱. 실패 시 2배 토큰으로 1회 재시도."""
    raw = get_llm().generate(prompt, max_new_tokens=max_new_tokens)
    try:
        return parse_llm_json(raw)
    except ValueError:
        raw2 = get_llm().generate(prompt, max_new_tokens=min(max_new_tokens * 2, 4096))
        return parse_llm_json(raw2)
