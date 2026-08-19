"""Database connection handling.

Deliberately thin: takes an already-resolved connection string from the
environment (INGEST_DATABASE_URL) and never logs it. If the variable is
absent, `require_connection` raises a clear, actionable error rather than
attempting to connect with an empty string.
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

import psycopg

from flightpulse_ingestor.config import IngestorSettings


class DatabaseNotConfiguredError(RuntimeError):
    pass


@contextmanager
def connect(settings: IngestorSettings) -> Iterator[psycopg.Connection]:
    if not settings.ingest_database_url:
        raise DatabaseNotConfiguredError(
            "INGEST_DATABASE_URL is not set. This is expected until CockroachDB "
            "Cloud provisioning is completed (see docs/deployment.md#deferred-database-setup)."
        )
    conn = psycopg.connect(settings.ingest_database_url, autocommit=False)
    try:
        yield conn
    finally:
        conn.close()
