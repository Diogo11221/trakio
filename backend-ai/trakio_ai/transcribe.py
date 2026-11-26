"""Speech to text for "dizer a refeição", run locally with faster-whisper (no audio leaves the server)."""

from __future__ import annotations

import logging
import tempfile
import threading

from trakio_ai.config import settings

log = logging.getLogger(__name__)

# Magic bytes of the formats phones record: m4a/mp4 (iOS, Android), webm (web), wav, ogg, caf.
_SIGNATURES = [(4, b"ftyp"), (0, b"\x1aE\xdf\xa3"), (0, b"RIFF"), (0, b"OggS"), (0, b"caff")]


class TranscriptionUnavailable(RuntimeError):
    pass


def looks_like_audio(data: bytes) -> bool:
    return any(data[offset:offset + len(sig)] == sig for offset, sig in _SIGNATURES)


class Transcriber:
    def __init__(self) -> None:
        self._model = None
        self._lock = threading.Lock()

    def _load(self):
        if self._model is None:
            with self._lock:
                if self._model is None:
                    try:
                        from faster_whisper import WhisperModel
                    except ImportError as e:
                        raise TranscriptionUnavailable("faster-whisper is not installed (pip install '.[voice]')") from e
                    self._model = WhisperModel(settings().whisper_model, device="cpu", compute_type="int8")
        return self._model

    def transcribe(self, audio: bytes) -> str:
        model = self._load()
        with tempfile.NamedTemporaryFile(suffix=".audio") as f:
            f.write(audio)
            f.flush()
            segments, _ = model.transcribe(f.name, language="pt", vad_filter=True)
            return " ".join(s.text.strip() for s in segments).strip()[:500]
