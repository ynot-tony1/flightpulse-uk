"""Idempotent upsert helpers.

Every insert here relies on the unique constraints defined in
packages/database/prisma/schema.prisma so that re-running an import with an
unchanged source file is a no-op at the row level (section 83).
"""

from __future__ import annotations

from dataclasses import dataclass

import psycopg


@dataclass
class UpsertResult:
    inserted: int = 0
    updated: int = 0
    unchanged: int = 0


def upsert_airport_monthly_metric(
    cur: psycopg.Cursor,
    *,
    airport_id: str,
    year: int,
    month: int,
    metric_code: str,
    value: float,
    unit: str,
    source_dataset_id: str,
    source_release_id: str,
) -> str:
    """Returns 'inserted' or 'updated'."""
    cur.execute(
        """
        INSERT INTO airport_monthly_metrics
            (id, airport_id, year, month, period_start, metric_code, value, unit,
             source_dataset_id, source_release_id, created_at, updated_at)
        VALUES
            (gen_random_uuid()::text, %(airport_id)s, %(year)s, %(month)s,
             make_date(%(year)s, %(month)s, 1), %(metric_code)s, %(value)s, %(unit)s,
             %(source_dataset_id)s, %(source_release_id)s, now(), now())
        ON CONFLICT (airport_id, year, month, metric_code)
        DO UPDATE SET
            value = EXCLUDED.value,
            unit = EXCLUDED.unit,
            source_dataset_id = EXCLUDED.source_dataset_id,
            source_release_id = EXCLUDED.source_release_id,
            updated_at = now()
        RETURNING (xmax = 0) AS inserted
        """,
        {
            "airport_id": airport_id,
            "year": year,
            "month": month,
            "metric_code": metric_code,
            "value": value,
            "unit": unit,
            "source_dataset_id": source_dataset_id,
            "source_release_id": source_release_id,
        },
    )
    row = cur.fetchone()
    return "inserted" if row and row[0] else "updated"


def upsert_route_monthly_metric(
    cur: psycopg.Cursor,
    *,
    route_id: str,
    year: int,
    month: int,
    passengers: float | None,
    flights: float | None,
    freight_tonnes: float | None,
    source_table: str,
    source_dataset_id: str,
    source_release_id: str,
) -> str:
    cur.execute(
        """
        INSERT INTO route_monthly_metrics
            (id, route_id, year, month, passengers, flights, freight_tonnes,
             source_table, source_dataset_id, source_release_id, created_at, updated_at)
        VALUES
            (gen_random_uuid()::text, %(route_id)s, %(year)s, %(month)s, %(passengers)s,
             %(flights)s, %(freight_tonnes)s, %(source_table)s, %(source_dataset_id)s,
             %(source_release_id)s, now(), now())
        ON CONFLICT (route_id, year, month)
        DO UPDATE SET
            passengers = EXCLUDED.passengers,
            flights = EXCLUDED.flights,
            freight_tonnes = EXCLUDED.freight_tonnes,
            source_table = EXCLUDED.source_table,
            source_dataset_id = EXCLUDED.source_dataset_id,
            source_release_id = EXCLUDED.source_release_id,
            updated_at = now()
        RETURNING (xmax = 0) AS inserted
        """,
        {
            "route_id": route_id,
            "year": year,
            "month": month,
            "passengers": passengers,
            "flights": flights,
            "freight_tonnes": freight_tonnes,
            "source_table": source_table,
            "source_dataset_id": source_dataset_id,
            "source_release_id": source_release_id,
        },
    )
    row = cur.fetchone()
    return "inserted" if row and row[0] else "updated"
