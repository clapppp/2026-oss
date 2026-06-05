import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import Optional

import httpx

KOPIS_BASE = "http://kopis.or.kr/openApi/restful"

# 공연 기반 분야 — KOPIS 조회 대상
KOPIS_CATEGORIES = {"연극", "공연", "무용", "국악", "대중음악", "일반음악"}


def _text(el: ET.Element, tag: str) -> str:
    child = el.find(tag)
    return child.text.strip() if child is not None and child.text else ""


def _date_range(date_str: str, days: int = 90) -> tuple[str, str]:
    """YYYY.MM.DD / YYYYMMDD 형식 날짜를 기준으로 ±days 범위 반환."""
    clean = re.sub(r"[.\-/]", "", date_str or "")
    try:
        dt = datetime.strptime(clean[:8], "%Y%m%d")
    except ValueError:
        dt = datetime.today()
    start = (dt - timedelta(days=days)).strftime("%Y%m%d")
    end   = (dt + timedelta(days=days)).strftime("%Y%m%d")
    return start, end


def _search(api_key: str, title: str, stdate: str, eddate: str) -> list[dict]:
    params = {
        "service": api_key,
        "stdate":  stdate,
        "eddate":  eddate,
        "shprfnm": title,
        "rows":    5,
        "cpage":   1,
    }
    try:
        resp = httpx.get(f"{KOPIS_BASE}/pblprfr", params=params, timeout=10)
        resp.raise_for_status()
        root = ET.fromstring(resp.text)
    except Exception:
        return []

    results = []
    for db in root.findall("db"):
        results.append({
            "id":    _text(db, "mt20id"),
            "title": _text(db, "prfnm"),
            "start": _text(db, "prfpdfrom"),
            "end":   _text(db, "prfpdto"),
            "venue": _text(db, "fcltynm"),
            "genre": _text(db, "genrenm"),
            "state": _text(db, "prfstate"),
        })
    return results


def _detail(api_key: str, mt20id: str) -> Optional[dict]:
    if not mt20id:
        return None
    try:
        resp = httpx.get(
            f"{KOPIS_BASE}/pblprfr/{mt20id}",
            params={"service": api_key},
            timeout=10,
        )
        resp.raise_for_status()
        root = ET.fromstring(resp.text)
        db = root.find("db")
        if db is None:
            return None
    except Exception:
        return None

    return {
        "id":      _text(db, "mt20id"),
        "title":   _text(db, "prfnm"),
        "start":   _text(db, "prfpdfrom"),
        "end":     _text(db, "prfpdto"),
        "venue":   _text(db, "fcltynm"),
        "cast":    _text(db, "prfcast"),
        "crew":    _text(db, "prfcrew"),
        "genre":   _text(db, "genrenm"),
        "state":   _text(db, "prfstate"),
        "runtime": _text(db, "prfruntime"),
        "company": _text(db, "entrpsnm"),
    }


def lookup_entry(api_key: str, category: str, entry: dict) -> Optional[dict]:
    """엔트리 하나에 대해 KOPIS 조회를 수행한다.

    카테고리가 KOPIS 대상이 아니거나 API 키가 없으면 None 반환.
    조회 성공 여부와 관계없이 예외를 던지지 않는다.
    """
    if not api_key or category not in KOPIS_CATEGORIES:
        return None

    title = (entry.get("title") or "").strip()
    if not title:
        return None

    date  = entry.get("performanceStartDate") or entry.get("date") or entry.get("publishDate") or ""
    venue = entry.get("venue") or ""

    stdate, eddate = _date_range(date)
    candidates = _search(api_key, title, stdate, eddate)

    if not candidates:
        return {"searched": True, "found": False, "title": title, "venue_claimed": venue, "candidates": []}

    # 공연장명이 가장 가까운 것을 1순위로 정렬
    if venue:
        candidates.sort(
            key=lambda c: 0 if venue in c.get("venue", "") or c.get("venue", "") in venue else 1
        )

    best = candidates[0]
    detail = _detail(api_key, best.get("id", ""))

    return {
        "searched":      True,
        "found":         True,
        "venue_claimed": venue,
        "matched":       detail or best,
        "candidates":    candidates[:3],
    }


def lookup_all_entries(
    api_key: str,
    categories: list[dict],
) -> dict[str, list[Optional[dict]]]:
    """전체 카테고리의 엔트리에 대해 KOPIS 조회를 수행한다.

    반환값: { "연극": [result_entry0, result_entry1, ...], ... }
    """
    results: dict[str, list[Optional[dict]]] = {}
    for cat in categories:
        cat_name = cat["name"]
        entries  = cat.get("entries", [])
        results[cat_name] = [
            lookup_entry(api_key, cat_name, e) for e in entries
        ]
    return results
