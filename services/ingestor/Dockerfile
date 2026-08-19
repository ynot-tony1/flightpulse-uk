FROM python:3.12-slim AS base

# Build context must be the repository root (config/ is shared, top-level):
#   docker build -t flightpulse-ingestor -f services/ingestor/Dockerfile .

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY services/ingestor/pyproject.toml ./
COPY services/ingestor/src ./src
COPY config ./config

ENV FLIGHTPULSE_CONFIG_DIR=/app/config

RUN pip install --no-cache-dir .

ENTRYPOINT ["ingestor"]
CMD ["--help"]
