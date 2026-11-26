import os
from pathlib import Path

os.environ.setdefault("TRAKIO_AI_TOKEN", "test-token-" + "x" * 40)
os.environ.setdefault("TRAKIO_AI_MODEL_DIR", str(Path(__file__).resolve().parent / ".models"))
