"""
PaddleOCR 래퍼 — 한국어 문서 텍스트 추출 + 회전 보정.
싱글톤으로 관리해 서버 재시작 없이 재사용.
"""

import math
import numpy as np
from PIL import Image, ImageEnhance

_ocr = None


_PADDLE_BASE = "/workspace/.paddleocr/whl"

def get_ocr():
    global _ocr
    if _ocr is None:
        from paddleocr import PaddleOCR
        _ocr = PaddleOCR(
            use_angle_cls=True,
            lang="korean",
            show_log=False,
            det_model_dir=f"{_PADDLE_BASE}/det/ml/Multilingual_PP-OCRv3_det_infer",
            rec_model_dir=f"{_PADDLE_BASE}/rec/korean/korean_PP-OCRv4_rec_infer",
            cls_model_dir=f"{_PADDLE_BASE}/cls/ch_ppocr_mobile_v2.0_cls_infer",
        )
    return _ocr


def _preprocess(image: Image.Image) -> Image.Image:
    """OCR 전처리: 소형 이미지 2x 업스케일 + 대비/선명도 강화."""
    w, h = image.size
    if min(w, h) < 1000:
        image = image.resize((w * 2, h * 2), Image.LANCZOS)
    image = ImageEnhance.Contrast(image).enhance(1.2)
    image = ImageEnhance.Sharpness(image).enhance(1.5)
    return image


def _run_ocr(image: Image.Image):
    img_array = np.array(image.convert("RGB"))
    return get_ocr().ocr(img_array, cls=True)


def _detect_rotation(result) -> int:
    """
    OCR 결과 텍스트 박스 방향 벡터의 평균 각도로 문서 회전 감지.
    반환값: 0, 90, 180, 270 (보정에 필요한 CCW 회전 각도)
    """
    if not result or not result[0]:
        return 0

    boxes = [line[0] for line in result[0] if line]
    if len(boxes) < 3:
        return 0

    angles = []
    for box in boxes:
        dx = box[1][0] - box[0][0]
        dy = box[1][1] - box[0][1]
        angles.append(math.degrees(math.atan2(dy, dx)))

    mean_angle = sum(angles) / len(angles)

    if -45 <= mean_angle < 45:
        return 0
    elif 45 <= mean_angle < 135:
        return 90
    elif mean_angle >= 135 or mean_angle < -135:
        return 180
    else:
        return 270


def _text_from_result(result) -> str:
    lines = []
    if result and result[0]:
        for line in result[0]:
            if line and len(line) >= 2:
                text, confidence = line[1]
                if confidence > 0.5:
                    lines.append(text)
    return "\n".join(lines)


def ocr_and_correct(image: Image.Image) -> tuple[Image.Image, str]:
    """
    전처리 → 회전 감지 → 보정 → OCR 텍스트 반환.
    회전 없으면 OCR 1회, 회전 감지 시 2회 실행.
    반환: (보정된 이미지, 텍스트)
    """
    image = _preprocess(image)
    result = _run_ocr(image)
    rotation = _detect_rotation(result)

    if rotation != 0:
        image = image.rotate(rotation, expand=True)
        result = _run_ocr(image)

    return image, _text_from_result(result)


def extract_text(image: Image.Image) -> str:
    """회전 보정 없이 텍스트만 추출 (하위 호환용)."""
    return _text_from_result(_run_ocr(image))
