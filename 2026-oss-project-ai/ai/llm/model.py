import torch
import torch.nn as nn
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

if not hasattr(nn.Module, "set_submodule"):
    def _set_submodule(self, target: str, module: nn.Module) -> None:
        atoms = target.split(".")
        parent = self.get_submodule(".".join(atoms[:-1])) if len(atoms) > 1 else self
        setattr(parent, atoms[-1], module)
    nn.Module.set_submodule = _set_submodule

MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct"


class DocumentLLM(nn.Module):
    """
    Qwen2.5-7B-Instruct를 4bit 양자화로 로드.
    OCR 텍스트 프롬프트를 받아 JSON 필드를 추출한다.
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

        self.tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            quantization_config=bnb_config,
            device_map="auto",
            torch_dtype=torch.float16,
            trust_remote_code=True,
        )
        self.llm_dim: int = self.model.config.hidden_size

    @torch.inference_mode()
    def generate(self, text_prompt: str, max_new_tokens: int = 1024) -> str:
        """
        text_prompt: 시스템/사용자 프롬프트 문자열
        """
        messages = [
            {"role": "system", "content": "당신은 문서 분석 전문가입니다. JSON 외에 다른 텍스트는 출력하지 마세요."},
            {"role": "user",   "content": text_prompt},
        ]
        prompt = self.tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        input_ids = self.tokenizer(prompt, return_tensors="pt").input_ids.to(self.model.device)

        output_ids = self.model.generate(
            input_ids=input_ids,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=self.tokenizer.eos_token_id,
        )

        # 입력 부분 제거, 생성된 부분만 디코딩
        generated = output_ids[0][input_ids.shape[1]:]
        return self.tokenizer.decode(generated, skip_special_tokens=True)
