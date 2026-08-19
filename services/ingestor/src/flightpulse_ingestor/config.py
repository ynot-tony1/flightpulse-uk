"""Runtime configuration.

Database URLs are read from environment variables only. This module never
prints, logs, or otherwise surfaces their values — see
docs/operations.md#secret-handling.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class IngestorSettings:
    ingest_database_url: str | None
    ingestion_enabled: bool
    airport_stats_enabled: bool
    punctuality_stats_enabled: bool
    airline_stats_enabled: bool
    log_level: str
    data_dir: str
    request_timeout_seconds: float
    user_agent: str

    @property
    def has_database(self) -> bool:
        return bool(self.ingest_database_url)


def load_settings() -> IngestorSettings:
    def flag(name: str, default: str = "true") -> bool:
        return os.environ.get(name, default).strip().lower() in {"1", "true", "yes", "on"}

    return IngestorSettings(
        ingest_database_url=os.environ.get("INGEST_DATABASE_URL") or None,
        ingestion_enabled=flag("INGESTION_ENABLED"),
        airport_stats_enabled=flag("AIRPORT_STATS_ENABLED"),
        punctuality_stats_enabled=flag("PUNCTUALITY_STATS_ENABLED"),
        airline_stats_enabled=flag("AIRLINE_STATS_ENABLED"),
        log_level=os.environ.get("LOG_LEVEL", "INFO"),
        data_dir=os.environ.get("INGESTOR_DATA_DIR", "./.data"),
        request_timeout_seconds=float(os.environ.get("INGESTOR_TIMEOUT_SECONDS", "30")),
        user_agent="FlightPulseUK-Ingestor/0.1 (+https://github.com/) research/portfolio use",
    )
