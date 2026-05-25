import io
from PIL import Image
from pillow_heif import register_heif_opener

register_heif_opener()


def bytes_to_image(data: bytes) -> Image.Image:
    """이미지 바이트 → PIL Image. PIL이 열 수 없는 형식이면 ValueError 발생."""
    try:
        return Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        raise ValueError("지원하지 않는 파일 형식입니다. (jpg, heic, png, webp 등 이미지 파일을 업로드하세요)")
