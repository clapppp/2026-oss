import httpx
from typing import Optional

KMDB_URL = "https://api.koreafilm.or.kr/openapi-data2/wApi/json/query"
FILM_CATEGORIES = {"영화"}


def _fmt_date(d: str) -> str:
    """YYYYMMDD → YYYY.MM.DD"""
    d = (d or "").replace("-", "").replace(".", "").strip()
    return f"{d[:4]}.{d[4:6]}.{d[6:]}" if len(d) == 8 else d


def _search(api_key: str, title: str, size: int = 5) -> list[dict]:
    try:
        resp = httpx.get(
            KMDB_URL,
            params={
                "collection": "kmdb_new2",
                "title":      title,
                "ServiceKey": api_key,
                "listCount":  size,
                "detail":     "Y",
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return []

    data_items = data.get("Data", [])
    if not data_items:
        return []

    results = []
    for item in data_items[0].get("Result", []):
        directors = [
            d.get("directorNm", "")
            for d in item.get("directors", {}).get("director", [])
        ]
        open_dt = _fmt_date(item.get("openDt") or item.get("repRlsDate", ""))
        results.append({
            "title":     item.get("title", "").replace("!", "").strip(),
            "date":      open_dt,
            "company":   item.get("company", ""),
            "directors": ", ".join(d for d in directors if d),
            "genre":     item.get("genre", ""),
        })
    return results


def lookup_entry(api_key: str, category: str, entry: dict) -> Optional[dict]:
    if not api_key or category not in FILM_CATEGORIES:
        return None
    title = (entry.get("title") or "").strip()
    if not title:
        return None

    candidates = _search(api_key, title)
    if not candidates:
        return {"source": "kmdb", "searched": True, "found": False, "title": title, "candidates": []}

    return {
        "source":     "kmdb",
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
