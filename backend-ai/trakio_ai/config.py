"""Settings from the environment. The service refuses to start without its internal token."""

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    internal_token: str
    model: str
    effort: str
    whisper_model: str
    model_dir: Path
    max_image_bytes: int = 8 * 1024 * 1024
    max_audio_bytes: int = 10 * 1024 * 1024


@lru_cache
def settings() -> Settings:
    token = os.environ.get("TRAKIO_AI_TOKEN", "")
    if len(token) < 32:
        raise RuntimeError("TRAKIO_AI_TOKEN must be set to a random value of at least 32 characters")
    return Settings(
        internal_token=token,
        model=os.environ.get("TRAKIO_AI_MODEL", "claude-opus-5-5"),
        effort=os.environ.get("TRAKIO_AI_EFFORT", "low"),
        whisper_model=os.environ.get("TRAKIO_AI_WHISPER_MODEL", "small"),
        model_dir=Path(os.environ.get("TRAKIO_AI_MODEL_DIR", Path(__file__).resolve().parent.parent / "models")),
    )
