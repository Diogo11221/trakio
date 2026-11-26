"""HTTP API of backend-ai. Internal: every route except /health needs the shared token."""

from __future__ import annotations

import binascii
import logging
from functools import lru_cache

import anthropic
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status

from trakio_ai.config import settings
from trakio_ai.insights import InsightsRequest, InsightsResponse, suggest
from trakio_ai.meals import EstimateRequest, EstimateResponse, MealEstimator
from trakio_ai.readiness import ReadinessModel, ReadinessRequest, ReadinessResponse
from trakio_ai.security import require_internal_token
from trakio_ai.transcribe import Transcriber, TranscriptionUnavailable, looks_like_audio

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("trakio_ai")

settings()  # fail fast without the internal token

app = FastAPI(title="Trakio AI", docs_url=None, redoc_url=None, openapi_url=None)


@lru_cache
def readiness_model() -> ReadinessModel:
    return ReadinessModel.load()


@lru_cache
def estimator() -> MealEstimator:
    return MealEstimator()


@lru_cache
def transcriber() -> Transcriber:
    return Transcriber()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/meals/estimate", dependencies=[Depends(require_internal_token)])
def estimate_meal(req: EstimateRequest) -> EstimateResponse:
    try:
        return estimator().estimate(req)
    except (ValueError, binascii.Error):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid image")
    except anthropic.RateLimitError:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="model busy")
    except (anthropic.APIStatusError, anthropic.APIConnectionError) as e:
        log.error("Claude request failed: %s", type(e).__name__)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="model unavailable")


@app.post("/v1/transcribe", dependencies=[Depends(require_internal_token)])
async def transcribe(audio: UploadFile = File(...)) -> dict[str, str]:
    data = await audio.read(settings().max_audio_bytes + 1)
    if len(data) > settings().max_audio_bytes:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, detail="audio too long")
    if not looks_like_audio(data):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="not audio")
    try:
        return {"text": transcriber().transcribe(data)}
    except TranscriptionUnavailable:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="voice not available")


@app.post("/v1/readiness", dependencies=[Depends(require_internal_token)])
def readiness(req: ReadinessRequest) -> ReadinessResponse:
    return readiness_model().predict(req)


@app.post("/v1/insights", dependencies=[Depends(require_internal_token)])
def insights(req: InsightsRequest) -> InsightsResponse:
    return suggest(req, readiness_model())
