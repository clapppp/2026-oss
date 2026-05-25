"""
한국어 텍스트 임베딩 — klue/roberta-base mean pooling.
OCR 텍스트를 768-dim 벡터로 변환해 문서 의미 유사도에 사용.
"""

import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel

MODEL_NAME = "klue/roberta-base"
MAX_LENGTH = 512


class KoreanTextEmbedder:
    def __init__(self, device: str | None = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        print(f"KoreanTextEmbedder 로드 중: {MODEL_NAME}")
        self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        self.model = AutoModel.from_pretrained(MODEL_NAME)
        self.model.eval().to(self.device)
        self.embed_dim = self.model.config.hidden_size  # 768
        print(f"KoreanTextEmbedder 로드 완료 (embed_dim={self.embed_dim})")

    @torch.inference_mode()
    def get_embedding(self, text: str) -> list[float]:
        """OCR 텍스트 → 768-dim 임베딩 (float list)."""
        return self.get_embedding_tensor(text).tolist()

    @torch.inference_mode()
    def get_embedding_tensor(self, text: str) -> torch.Tensor:
        """OCR 텍스트 → (768,) tensor. attention mask 기반 mean pooling."""
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=MAX_LENGTH,
            padding=True,
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        outputs = self.model(**inputs)

        # mean pooling: [PAD] 토큰 제외
        mask = inputs["attention_mask"].unsqueeze(-1).float()
        summed = (outputs.last_hidden_state * mask).sum(dim=1)
        counts = mask.sum(dim=1).clamp(min=1e-9)
        return (summed / counts).squeeze(0)
