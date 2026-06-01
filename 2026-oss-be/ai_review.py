import base64
import json
import mimetypes
from typing import Optional

import anthropic

CATEGORY_RULES = {
    "문학": {
        "min_count": 1,
        "required_fields": ["title", "publisher", "genre", "publishDate", "volume", "character"],
        "field_labels": {
            "title": "작품명",
            "publisher": "발행처 (문예지명)",
            "genre": "세부장르",
            "publishDate": "발행일",
            "volume": "작품 분량",
            "character": "성격",
        },
        "genre_min": {
            "시/시조": 5, "수필": 5, "평론": 3,
            "소설/동화/청소년소설": 3, "평전": 1, "희곡": 1, "문학작품집": 1,
        },
        "special_rules": "소설/동화/청소년소설의 경우 장편 1편 또는 단편·기타 3편 이상 필요.",
    },
    "연극": {
        "min_count": 1,
        "required_fields": ["title", "venue", "date", "role"],
        "field_labels": {
            "title": "공연명",
            "venue": "공연장",
            "date": "공연일",
            "role": "역할",
        },
        "special_rules": None,
    },
}

FILE_SLOT_LABELS = {
    "workImage":   "작품 이미지",
    "detailPage1": "상세 페이지 1",
    "detailPage2": "상세 페이지 2",
    "income":      "수익 증빙",
    "other":       "기타 서류",
}

SYSTEM_PROMPT = """당신은 예술인 활동증명 심사 전문가입니다.
신청자가 제출한 활동 내역과 파일을 검토하고, 누락·오류·보완이 필요한 사항을 구체적으로 지적해주세요.

반드시 아래 JSON 형식으로만 응답하세요. 설명 없이 JSON만 반환하세요.

{
  "overall_summary": "전반적인 검토 의견 (2-3문장)",
  "is_sufficient": true | false,
  "issues": [
    {
      "severity": "error" | "warning",
      "category": "분야명",
      "entry_index": 0,
      "field": "필드명 또는 null",
      "file_slot": "파일 슬롯명 또는 null",
      "message": "구체적인 문제 설명"
    }
  ],
  "suggestions": ["보완 제안 1", "보완 제안 2"]
}

severity 기준:
- error: 반드시 수정해야 심사 가능한 항목
- warning: 보완하면 승인 가능성이 높아지는 항목"""


def _encode_file(file_bytes: bytes, filename: str) -> dict:
    mime = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    b64 = base64.standard_b64encode(file_bytes).decode()

    if mime.startswith("image/"):
        return {
            "type": "image",
            "source": {"type": "base64", "media_type": mime, "data": b64},
        }
    if mime == "application/pdf":
        return {
            "type": "document",
            "source": {"type": "base64", "media_type": "application/pdf", "data": b64},
        }
    # 그 외 파일은 텍스트로 설명만
    return None


def analyze_application(
    client: anthropic.Anthropic,
    category_name: str,
    entries: list[dict],
    files: dict[str, tuple[bytes, str]],  # slot -> (bytes, filename)
) -> dict:
    """
    category_name: "문학" | "연극"
    entries: 제출된 활동 내역 리스트
    files: {"{category}[{index}].{slot}": (bytes, filename)}
    """
    rules = CATEGORY_RULES.get(category_name)
    if not rules:
        return {"overall_summary": "지원하지 않는 분야입니다.", "is_sufficient": False, "issues": [], "suggestions": []}

    # 텍스트 프롬프트 구성
    rules_text = f"""[{category_name} 심사 기준]
- 최소 제출 건수: {rules['min_count']}편
- 필수 입력 항목: {', '.join(rules['field_labels'].values())}
"""
    if rules.get("genre_min"):
        genre_lines = "\n".join(f"  · {g}: {n}편" for g, n in rules["genre_min"].items())
        rules_text += f"- 장르별 최소 편수:\n{genre_lines}\n"
    if rules.get("special_rules"):
        rules_text += f"- 특이사항: {rules['special_rules']}\n"

    entries_text = f"\n[제출된 활동 내역 — 총 {len(entries)}건]\n"
    for i, e in enumerate(entries):
        entries_text += f"\n항목 {i+1}:\n"
        for k, v in e.items():
            if k not in ("category", "entryStatus", "entryReason") and v:
                label = rules["field_labels"].get(k, k)
                entries_text += f"  {label}: {v}\n"

    files_text = "\n[첨부 파일 현황]\n"
    for slot_key, (_, fname) in files.items():
        files_text += f"  {slot_key} → {fname}\n"
    if not files:
        files_text += "  (첨부 파일 없음)\n"

    user_content = [
        {"type": "text", "text": rules_text + entries_text + files_text + "\n위 내용을 검토해주세요."}
    ]

    # 파일 블록 추가 (이미지/PDF만)
    for slot_key, (file_bytes, filename) in files.items():
        block = _encode_file(file_bytes, filename)
        if block:
            slot_label = slot_key.split(".")[-1]
            user_content.append({"type": "text", "text": f"[파일: {FILE_SLOT_LABELS.get(slot_label, slot_label)}]"})
            user_content.append(block)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )

    raw = response.content[0].text.strip()
    # JSON 코드블록 제거
    if "```" in raw:
        parts = raw.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{"):
                raw = part
                break
    # JSON 시작/끝 위치로 추출
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start >= 0 and end > start:
        raw = raw[start:end]
    return json.loads(raw)


def analyze_full_application(
    client: anthropic.Anthropic,
    categories: list[dict],
    files: dict[str, tuple[bytes, str]],
) -> dict:
    """여러 분야를 한 번에 분석. 분야별 결과를 합쳐서 반환."""
    results_by_category = {}
    all_issues = []
    all_suggestions = []
    all_sufficient = True

    for cat in categories:
        cat_name = cat["name"]
        entries = cat.get("entries", [])
        cat_files = {k: v for k, v in files.items() if k.startswith(f"{cat_name}[")}

        result = analyze_application(client, cat_name, entries, cat_files)
        results_by_category[cat_name] = result
        all_issues.extend(result.get("issues", []))
        all_suggestions.extend(result.get("suggestions", []))
        if not result.get("is_sufficient", True):
            all_sufficient = False

    return {
        "is_sufficient": all_sufficient,
        "by_category": results_by_category,
        "all_issues": all_issues,
        "all_suggestions": list(dict.fromkeys(all_suggestions)),
    }
