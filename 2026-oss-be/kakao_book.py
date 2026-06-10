import httpx
from typing import Optional

KAKAO_BOOK_URL = "https://dapi.kakao.com/v3/search/book"
BOOK_CATEGORIES = {"문학", "만화"}


def _fmt_date(dt: str) -> str:
    """2020-03-15T00:00:00.000+09:00 → 2020.03.15"""
    return dt[:10].replace("-", ".") if dt and len(dt) >= 10 else ""


def _search(api_key: str, title: str, size: int = 5) -> list[dict]:
    try:
        resp = httpx.get(
            KAKAO_BOOK_URL,
            headers={"Authorization": f"KakaoAK {api_key}"},
            params={"query": title, "target": "title", "size": size},
            timeout=10,
        )
        resp.raise_for_status()
        docs = resp.json().get("documents", [])
    except Exception:
        return []

    results = []
    for doc in docs:
        isbn_raw = doc.get("isbn", "")
        isbn13 = next((s.strip() for s in isbn_raw.split() if len(s.strip()) == 13), "")
        results.append({
            "title":     doc.get("title", ""),
            "authors":   ", ".join(doc.get("authors", [])),
            "publisher": doc.get("publisher", ""),
            "date":      _fmt_date(doc.get("datetime", "")),
            "isbn":      isbn13,
        })
    return results


def lookup_entry(api_key: str, category: str, entry: dict) -> Optional[dict]:
    if not api_key or category not in BOOK_CATEGORIES:
        return None
    title = (entry.get("title") or "").strip()
    if not title:
        return None

    candidates = _search(api_key, title)
    if not candidates:
        return {"source": "kakao_book", "searched": True, "found": False, "title": title, "candidates": []}

    return {
        "source":     "kakao_book",
        "searched":   True,
        "found":      True,
        "matched":    candidates[0],
        "candidates": candidates[:3],
    }


def lookup_all_entries(api_key: str, categories: list[dict]) -> dict[str, list[Optional[dict]]]:
    results: dict[str, list[Optional[dict]]] = {}
    for cat in categories:
        cat_name = cat["name"]
        entries = cat.get("entries", [])
        results[cat_name] = [lookup_entry(api_key, cat_name, e) for e in entries]
    return results
