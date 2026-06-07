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


def _extract_pdf(file_bytes: bytes) -> str:
    try:
        import fitz  # pymupdf
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        texts = []
        for page in doc:
            # 모든 페이지를 이미지로 렌더링 후 OCR (300 DPI)
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
