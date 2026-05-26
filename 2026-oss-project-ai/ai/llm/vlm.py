import os
import torch
import torch.nn as nn
from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor, BitsAndBytesConfig
from PIL import Image

os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

MODEL_NAME = "Qwen/Qwen2.5-VL-7B-Instruct"

# 8GB VRAM 기준 안전한 최대 픽셀 수.
# Qwen2.5-VL은 28x28 패치 단위로 토큰화하므로 픽셀이 많을수록 KV 캐시가 폭증한다.
# 512*28*28 ≈ 401K 픽셀 → 약 512 이미지 토큰으로 제한.
_MAX_PIXELS = 512 * 28 * 28
_MIN_PIXELS = 4 * 28 * 28


class DocumentVLM(nn.Module):
    """
    Qwen2.5-VL-7B-Instruct 4bit 양자화 로드.
    이미지 + 텍스트 프롬프트를 받아 JSON 필드를 추출한다.
    """

    def __init__(self, model_name: str = MODEL_NAME, use_4bit: bool = True):
        super().__init__()
        bnb_config = None
        if use_4bit:
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_use_double_quant=True,
            )
        self.model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
            model_name,
            quantization_config=bnb_config,
            device_map="auto",
            torch_dtype=torch.float16,
            trust_remote_code=True,
        )
        self.processor = AutoProcessor.from_pretrained(
            model_name,
            trust_remote_code=True,
            min_pixels=_MIN_PIXELS,
            max_pixels=_MAX_PIXELS,
        )

    @staticmethod
    def _resize_for_vram(image: Image.Image) -> Image.Image:
        """이미지 픽셀 수를 _MAX_PIXELS 이하로 줄인다."""
        w, h = image.size
        if w * h <= _MAX_PIXELS:
            return image
        scale = (_MAX_PIXELS / (w * h)) ** 0.5
        return image.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    @torch.inference_mode()
    def generate(self, image: Image.Image, text_prompt: str, max_new_tokens: int = 1024) -> str:
        from qwen_vl_utils import process_vision_info
        image = self._resize_for_vram(image)
        messages = [
            {
                "role": "system",
                "content": "당신은 문서 분석 전문가입니다. JSON 외에 다른 텍스트는 출력하지 마세요.",
            },
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": text_prompt},
                ],
            },
        ]
        text = self.processor.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        image_inputs, video_inputs = process_vision_info(messages)
        inputs = self.processor(
            text=[text],
            images=image_inputs,
            videos=video_inputs if video_inputs else None,
            padding=True,
            return_tensors="pt",
        ).to(self.model.device)

        output_ids = self.model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
        )
        generated = output_ids[0][inputs.input_ids.shape[1]:]
        return self.processor.decode(generated, skip_special_tokens=True)
