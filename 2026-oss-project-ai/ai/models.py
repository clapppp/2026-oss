"""
텍스트 임베더 / LLM / VLM 공유 싱글톤 + 응답 파싱 유틸.
8GB VRAM 제약으로 LLM과 VLM은 동시에 로드할 수 없다.
엔진 전환 시 기존 모델을 해제하고 새 모델을 로드한다.
"""

import json

_text_embedder = None
_llm = None
_vlm = None


def get_text_embedder():
    global _text_embedder
    if _text_embedder is None:
        from ai.embedding.text import KoreanTextEmbedder
        _text_embedder = KoreanTextEmbedder()
    return _text_embedder


def _release_llm():
    global _llm
    if _llm is not None:
        import gc, torch
        del _llm
        _llm = None
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


def _release_vlm():
    global _vlm
    if _vlm is not None:
        import gc, torch
        del _vlm
        _vlm = None
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


def get_llm():
    global _llm
    if _llm is None:
        _release_vlm()
        from ai.llm.model import DocumentLLM
        _llm = DocumentLLM()
    return _llm


def get_vlm():
    global _vlm
    if _vlm is None:
        _release_llm()
        from ai.llm.vlm import DocumentVLM
        _vlm = DocumentVLM()
    return _vlm


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
