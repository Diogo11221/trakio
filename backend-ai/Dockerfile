# syntax=docker/dockerfile:1
FROM python:3.13-slim
# VOICE=1 adds local speech-to-text (faster-whisper); the model downloads on first use.
ARG VOICE=0
RUN groupadd --system trakio && useradd --system --gid trakio --home /app trakio
WORKDIR /app
COPY pyproject.toml ./
COPY trakio_ai trakio_ai
RUN pip install --no-cache-dir . && if [ "$VOICE" = "1" ]; then pip install --no-cache-dir ".[voice]"; fi
# Train the bootstrap readiness model at build time, so the container starts ready.
RUN mkdir -p models && TRAKIO_AI_TOKEN=build-only-$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n') \
    python -m trakio_ai.training --out models/readiness.joblib && chown -R trakio:trakio /app
USER trakio
ENV TRAKIO_AI_MODEL_DIR=/app/models HF_HOME=/tmp/hf
EXPOSE 8000
CMD ["uvicorn", "trakio_ai.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
