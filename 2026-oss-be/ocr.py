import logging
import mimetypes
import os
import subprocess
import tempfile

TESSERACT_CMD = os.environ.get("TESSERACT_CMD", "tesseract")
log = logging.getLogger("artpass.ocr")


def extract_text(file_bytes: bytes, filename: str) -> str:
    """파일에서 텍스트를 추출한다. 실패 시 빈 문자열 반환."""
    mime = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    log.debug("[OCR 시작] %s (%s, %d bytes)", filename, mime, len(file_bytes))
    if mime == "application/pdf":
        result = _extract_pdf(file_bytes)
    elif mime.startswith("image/"):
        result = _ocr_image_bytes(file_bytes, suffix=_img_suffix(mime))
    else:
        result = ""
    log.debug("[OCR 결과] %s → %d자 추출\n%s", filename, len(result), result[:300] or "(없음)")
    return result


# 페이지당 이 글자 수 이상이면 텍스트 레이어가 충분하다고 판단
_MIN_CHARS_PER_PAGE = 100


def _extract_pdf(file_bytes: bytes) -> str:
    try:
        import fitz  # pymupdf
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        page_count = len(doc)

        # 1단계: 텍스트 레이어 추출 시도
        layer_texts = [page.get_text().strip() for page in doc]
        total_chars = sum(len(t) for t in layer_texts)

        if total_chars >= _MIN_CHARS_PER_PAGE * page_count:
            # 텍스트 레이어가 충분 → OCR 생략
            log.debug("[PDF] 텍스트 레이어 사용 (%d자, OCR 생략)", total_chars)
            doc.close()
            return "\n".join(t for t in layer_texts if t)

        # 2단계: 텍스트가 부족한 페이지만 OCR 수행
        log.debug("[PDF] 텍스트 레이어 부족 (%d자) → OCR 수행", total_chars)
        texts = []
        for i, page in enumerate(doc):
            page_text = layer_texts[i]
            if len(page_text) >= _MIN_CHARS_PER_PAGE:
                # 이 페이지는 텍스트 레이어 충분
                texts.append(page_text)
            else:
                # 이미지 기반 페이지 → OCR
                pix = page.get_pixmap(dpi=300)
                ocr = _ocr_image_bytes(pix.tobytes("png"), suffix=".png")
                if ocr:
                    texts.append(ocr)
        doc.close()
        return "\n".join(texts)
    except Exception:
        return ""


def _ocr_image_bytes(image_bytes: bytes, suffix: str = ".png") -> str:
    """이미지 바이트를 임시 파일로 저장 후 tesseract 직접 실행."""
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as src:
        src.write(image_bytes)
        src_path = src.name

    out_path = src_path + "_out"
    try:
        result = subprocess.run(
            [TESSERACT_CMD, src_path, out_path, "-l", "kor+eng", "--psm", "3"],
            capture_output=True,
            timeout=30,
        )
        txt_path = out_path + ".txt"
        if os.path.exists(txt_path):
            with open(txt_path, encoding="utf-8") as f:
                return f.read().strip()
        return ""
    except Exception:
        return ""
    finally:
        for p in (src_path, out_path + ".txt"):
            try:
                os.unlink(p)
            except OSError:
                pass


def _img_suffix(mime: str) -> str:
    return {"image/jpeg": ".jpg", "image/png": ".png", "image/tiff": ".tiff"}.get(mime, ".png")
