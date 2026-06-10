import json
import logging
import datetime

import anthropic

from ocr import extract_text

log = logging.getLogger("artpass.ai")

FILE_SLOT_LABELS = {
    "workImage":   "작품 이미지",
    "detailPage1": "상세 페이지 1",
    "detailPage2": "상세 페이지 2",
    "income":      "수익 증빙",
    "other":       "기타 서류",
}

def _build_system_prompt() -> str:
    today = datetime.date.today().strftime("%Y년 %m월 %d일")
    return f"""당신은 예술인 활동증명 서류 검토 전문가입니다.
신청자가 폼에 입력한 정보, 회원 정보, KOPIS 공연 데이터(있는 경우), 첨부 파일의 OCR 추출 텍스트를 교차검증해주세요.

오늘 날짜는 {today}입니다. 이 날짜를 기준으로 과거/현재/미래를 판단하세요.

[검증 원칙]
- 각 첨부 파일에 해당 항목의 작품명(또는 공연명/프로그램명)이 포함되어 있는지 확인하세요.
- 파일 내용과 폼 입력값(날짜, 장소, 관계자 등)이 일치하는지 확인하세요.
- KOPIS 데이터가 제공된 경우, 폼 입력값과 KOPIS 실제 데이터의 불일치를 지적하세요.
- 사용자 정보(이름 등)가 파일 내용과 일치하는지 확인하세요.

반드시 아래 JSON 형식으로만 응답하세요. 설명 없이 JSON만 반환하세요.

{{
  "overall_summary": "전반적인 교차검증 결과 (2-3문장)",
  "is_sufficient": true | false,
  "issues": [
    {{
      "severity": "error" | "warning",
      "category": "분야명",
      "entry_index": 0,
      "field": "불일치 필드명 또는 null",
      "file_slot": "해당 파일 슬롯명 또는 null",
      "message": "구체적인 불일치 또는 미포함 내용"
    }}
  ],
  "suggestions": ["보완 제안 1", "보완 제안 2"]
}}

severity 기준:
- error: 작품명 미포함, 데이터 불일치 등 명확한 문제
- warning: 확인이 필요하거나 불명확한 항목"""


def _external_section(external_results: list) -> str:
    lines = []
    for i, r in enumerate(external_results):
        if r is None:
            continue
        source = r.get("source", "external")
        prefix = {
            "kopis":      "KOPIS 공연예술통합정보",
            "kakao_book": "카카오 도서 검색",
            "kmdb":       "KMDB 한국영화데이터베이스",
        }.get(source, source)

        if not r.get("found"):
            lines.append(f"  항목 {i+1}: [{prefix}] '{r.get('title', '')}' 미발견")
            continue

        m = r.get("matched", {})
        lines.append(f"  항목 {i+1}: [{prefix}] 일치 데이터 발견")

        if source == "kopis":
            lines.append(f"    공연명: {m.get('title', '')}")
            lines.append(f"    공연기간: {m.get('start', '')} ~ {m.get('end', '')}")
            lines.append(f"    공연장(KOPIS): {m.get('venue', '')}")
            lines.append(f"    신청자 기재 공연장: {r.get('venue_claimed', '')}")
            if m.get("cast"):  lines.append(f"    출연진: {m['cast']}")
            if m.get("crew"):  lines.append(f"    제작진: {m['crew']}")
        elif source == "kakao_book":
            lines.append(f"    제목: {m.get('title', '')}")
            lines.append(f"    저자: {m.get('authors', '')}")
            lines.append(f"    출판사: {m.get('publisher', '')}")
            lines.append(f"    출판일: {m.get('date', '')}")
            if m.get("isbn"):  lines.append(f"    ISBN: {m['isbn']}")
        elif source == "kmdb":
            lines.append(f"    영화명: {m.get('title', '')}")
            lines.append(f"    개봉일: {m.get('date', '')}")
            lines.append(f"    감독: {m.get('directors', '')}")
            lines.append(f"    제작사: {m.get('company', '')}")
            lines.append(f"    장르: {m.get('genre', '')}")

    if not lines:
        return ""
    return "\n[외부 데이터베이스 조회 결과]\n" + "\n".join(lines)


def analyze_application(
    client: anthropic.Anthropic,
    category_name: str,
    entries: list[dict],
    files: dict[str, tuple[bytes, str]],
    user_info: dict | None = None,
    external_results: list | None = None,
) -> dict:
    # 사용자 정보
    user_text = ""
    if user_info:
        user_text = (
            f"\n[신청자 정보]\n"
            f"  이름: {user_info.get('name', '')}\n"
            f"  생년월일: {user_info.get('birth', '')}\n"
            f"  성별: {user_info.get('gender', '')}\n"
        )

    # 폼 입력 데이터
    entries_text = f"\n[{category_name} — 폼 입력 데이터 ({len(entries)}건)]\n"
    for i, e in enumerate(entries):
        entries_text += f"\n항목 {i+1}:\n"
        for k, v in e.items():
            if k not in ("category", "entryStatus", "entryReason", "files") and v:
                entries_text += f"  {k}: {v}\n"

    # 첨부 파일 OCR 텍스트
    files_text = "\n[첨부 파일 OCR 텍스트]\n"
    if files:
        for slot_key, (file_bytes, filename) in files.items():
            slot_label = FILE_SLOT_LABELS.get(slot_key.split(".")[-1], slot_key)
            ocr = extract_text(file_bytes, filename)
            files_text += f"\n--- {slot_label} ({filename}) ---\n"
            files_text += ocr if ocr else "(텍스트 추출 불가)\n"
    else:
        files_text += "  (첨부 파일 없음)\n"

    external_text = _external_section(external_results) if external_results else ""

    prompt_text = user_text + entries_text + files_text + external_text + "\n위 데이터를 교차검증해주세요."
    log.debug("[LLM 프롬프트] 분야=%s\n%s", category_name, prompt_text)

    user_content = [{"type": "text", "text": prompt_text}]

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=_build_system_prompt(),
        messages=[{"role": "user", "content": user_content}],
    )

    raw = response.content[0].text.strip()
    log.debug("[LLM 응답] 분야=%s\n%s", category_name, raw)
    if "```" in raw:
        for part in raw.split("```"):
            part = part.strip().lstrip("json").strip()
            if part.startswith("{"):
                raw = part
                break
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start >= 0 and end > start:
        raw = raw[start:end]
    return json.loads(raw)


def analyze_full_application(
    client: anthropic.Anthropic,
    categories: list[dict],
    files: dict[str, tuple[bytes, str]],
    user_info: dict | None = None,
    external_by_category: dict[str, list] | None = None,
) -> dict:
    results_by_category = {}
    all_issues = []
    all_suggestions = []
    all_sufficient = True

    for cat in categories:
        cat_name = cat["name"]
        entries = cat.get("entries", [])
        cat_files = {k: v for k, v in files.items() if k.startswith(f"{cat_name}[")}
        external_results = (external_by_category or {}).get(cat_name)

        result = analyze_application(client, cat_name, entries, cat_files, user_info, external_results)
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
