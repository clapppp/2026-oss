import os
import sys

_VENV_PY = "/workspace/venv/bin/python"
if os.path.exists(_VENV_PY) and os.path.abspath(sys.executable) != os.path.abspath(_VENV_PY):
    os.execv(_VENV_PY, [_VENV_PY] + sys.argv)

os.environ.setdefault("HF_HOME", "/workspace/.cache/huggingface")

import uvicorn

if __name__ == "__main__":
    from back.main import app
    uvicorn.run(
        app,
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
    )
