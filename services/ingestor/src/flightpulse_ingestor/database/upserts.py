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
    return "upserted"


def upsert_airport(
    cur: psycopg.Cursor,
    *,
    canonical_code: str,
    iata_code: str | None,
    icao_code: str | None,
    caa_name: str,
    display_name: str,
    normalised_name: str,
    municipality: str | None,
    country_code: str,
    country_name: str,
    latitude: float,
    longitude: float,
    elevation_ft: int | None,
    airport_type: str,
    caa_reporting_airport: bool,
) -> str:
    """Upserts an Airport row and returns its id."""
    cur.execute(
        """
        INSERT INTO airports
            (id, canonical_code, iata_code, icao_code, caa_name, display_name,
             normalised_name, municipality, country_code, country_name,
             latitude, longitude, elevation_ft, airport_type,
             caa_reporting_airport, punctuality_monitored, created_at, updated_at)
        VALUES
            (gen_random_uuid()::text, %(canonical_code)s, %(iata_code)s, %(icao_code)s,
             %(caa_name)s, %(display_name)s, %(normalised_name)s, %(municipality)s,
             %(country_code)s, %(country_name)s, %(latitude)s, %(longitude)s,
             %(elevation_ft)s, %(airport_type)s, %(caa_reporting_airport)s, false, now(), now())
        ON CONFLICT (canonical_code)
        DO UPDATE SET
            iata_code = EXCLUDED.iata_code,
            icao_code = EXCLUDED.icao_code,
            caa_name = EXCLUDED.caa_name,
            display_name = EXCLUDED.display_name,
            normalised_name = EXCLUDED.normalised_name,
            municipality = EXCLUDED.municipality,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            elevation_ft = EXCLUDED.elevation_ft,
            airport_type = EXCLUDED.airport_type,
            caa_reporting_airport = EXCLUDED.caa_reporting_airport,
            updated_at = now()
        RETURNING id
        """,
        {
            "canonical_code": canonical_code,
            "iata_code": iata_code,
            "icao_code": icao_code,
            "caa_name": caa_name,
            "display_name": display_name,
            "normalised_name": normalised_name,
            "municipality": municipality,
            "country_code": country_code,
            "country_name": country_name,
            "latitude": latitude,
            "longitude": longitude,
            "elevation_ft": elevation_ft,
            "airport_type": airport_type,
            "caa_reporting_airport": caa_reporting_airport,
        },
    )
    row = cur.fetchone()
    assert row is not None
    return str(row[0])


def mark_punctuality_monitored(cur: psycopg.Cursor, *, canonical_code: str) -> None:
    cur.execute(
        "UPDATE airports SET punctuality_monitored = true, updated_at = now() WHERE canonical_code = %(code)s;",
        {"code": canonical_code},
    )


def get_airport_id(cur: psycopg.Cursor, *, canonical_code: str) -> str | None:
    cur.execute("SELECT id FROM airports WHERE canonical_code = %(code)s;", {"code": canonical_code})
    row = cur.fetchone()
    return str(row[0]) if row else None


def upsert_route(
    cur: psycopg.Cursor,
    *,
    origin_airport_id: str,
    destination_airport_id: str,
    route_type: str,
    distance_km: float | None,
) -> str:
    cur.execute(
        """
        INSERT INTO routes
            (id, origin_airport_id, destination_airport_id, route_type, distance_km, created_at, updated_at)
        VALUES
            (gen_random_uuid()::text, %(origin)s, %(destination)s, %(route_type)s, %(distance_km)s, now(), now())
        ON CONFLICT (origin_airport_id, destination_airport_id)
        DO UPDATE SET route_type = EXCLUDED.route_type, distance_km = EXCLUDED.distance_km, updated_at = now()
        RETURNING id
        """,
        {
            "origin": origin_airport_id,
            "destination": destination_airport_id,
            "route_type": route_type,
            "distance_km": distance_km,
        },
    )
    row = cur.fetchone()
    assert row is not None
    return str(row[0])


def upsert_source_dataset(
    cur: psycopg.Cursor,
    *,
    dataset_code: str,
    source_organisation: str,
    dataset_name: str,
    data_family: str,
    official_url: str,
    licence_or_terms_url: str,
    required_attribution: str,
    update_frequency: str,
) -> str:
    cur.execute(
        """
        INSERT INTO source_datasets
            (id, source_organisation, dataset_code, dataset_name, data_family, official_url,
             licence_or_terms_url, required_attribution, update_frequency, enabled, created_at, updated_at)
        VALUES
            (gen_random_uuid()::text, %(org)s, %(code)s, %(name)s, %(family)s, %(url)s,
             %(licence)s, %(attribution)s, %(freq)s, true, now(), now())
        ON CONFLICT (dataset_code)
        DO UPDATE SET dataset_name = EXCLUDED.dataset_name, updated_at = now()
        RETURNING id
        """,
        {
            "org": source_organisation,
            "code": dataset_code,
            "name": dataset_name,
            "family": data_family,
            "url": official_url,
            "licence": licence_or_terms_url,
            "attribution": required_attribution,
            "freq": update_frequency,
        },
    )
    row = cur.fetchone()
    assert row is not None
    return str(row[0])


def upsert_source_release(
    cur: psycopg.Cursor,
    *,
    source_dataset_id: str,
    year: int,
    month: int,
    source_url: str,
    download_url: str,
    checksum_sha256: str,
    file_size_bytes: int,
    status: str,
    rows_imported: int,
) -> str:
    cur.execute(
        """
        INSERT INTO source_releases
            (id, source_dataset_id, year, month, source_url, download_url, checksum_sha256,
             file_size_bytes, status, rows_imported, retrieved_at, created_at)
        VALUES
            (gen_random_uuid()::text, %(dataset_id)s, %(year)s, %(month)s, %(source_url)s,
             %(download_url)s, %(checksum)s, %(size)s, %(status)s, %(rows)s, now(), now())
        ON CONFLICT (source_dataset_id, year, month, checksum_sha256)
        DO UPDATE SET status = EXCLUDED.status, rows_imported = EXCLUDED.rows_imported
        RETURNING id
        """,
        {
            "dataset_id": source_dataset_id,
            "year": year,
            "month": month,
            "source_url": source_url,
            "download_url": download_url,
            "checksum": checksum_sha256,
            "size": file_size_bytes,
            "status": status,
            "rows": rows_imported,
        },
    )
    row = cur.fetchone()
    assert row is not None
    return str(row[0])


def upsert_airline(
    cur: psycopg.Cursor, *, canonical_name: str, normalised_name: str, caa_name: str, iata_code: str | None
) -> str:
    cur.execute(
        """
        INSERT INTO airlines (id, canonical_name, normalised_name, caa_name, iata_code, active, created_at, updated_at)
        VALUES (gen_random_uuid()::text, %(name)s, %(norm)s, %(caa)s, %(iata)s, true, now(), now())
        ON CONFLICT (normalised_name)
        DO UPDATE SET canonical_name = EXCLUDED.canonical_name, updated_at = now()
        RETURNING id
        """,
        {"name": canonical_name, "norm": normalised_name, "caa": caa_name, "iata": iata_code},
    )
    row = cur.fetchone()
    assert row is not None
    return str(row[0])


def upsert_airline_monthly_metric(
    cur: psycopg.Cursor,
    *,
    airline_id: str,
    year: int,
    month: int,
    metric_code: str,
    value: float,
    unit: str,
    service_category: str | None,
    source_dataset_id: str,
    source_release_id: str,
) -> str:
    cur.execute(
        """
        INSERT INTO airline_monthly_metrics
            (id, airline_id, year, month, metric_code, value, unit, service_category,
             source_dataset_id, source_release_id, created_at, updated_at)
        VALUES
            (gen_random_uuid()::text, %(airline_id)s, %(year)s, %(month)s, %(metric_code)s,
             %(value)s, %(unit)s, %(service_category)s, %(source_dataset_id)s, %(source_release_id)s, now(), now())
        ON CONFLICT (airline_id, year, month, metric_code, service_category)
        DO UPDATE SET value = EXCLUDED.value, updated_at = now()
        """,
        {
            "airline_id": airline_id,
            "year": year,
            "month": month,
            "metric_code": metric_code,
            "value": value,
            "unit": unit,
            "service_category": service_category,
            "source_dataset_id": source_dataset_id,
            "source_release_id": source_release_id,
        },
    )
    return "upserted"


def delete_punctuality_for_period(cur: psycopg.Cursor, *, year: int, month: int) -> None:
    """CAA punctuality is published as one whole-month file per period, and
    PunctualityMetric has no meaningful unique key across its nullable
    dimension columns (destination/airline/service/direction — NULL is not
    equal to NULL under standard SQL uniqueness). Idempotency is therefore
    achieved by replacing the whole period's rows on each import, rather
    than a per-row upsert."""
    cur.execute(
        "DELETE FROM punctuality_metrics WHERE year = %(year)s AND month = %(month)s;", {"year": year, "month": month}
    )


def upsert_punctuality_metric(
    cur: psycopg.Cursor,
    *,
    year: int,
    month: int,
    airport_id: str,
    destination_airport_id: str | None,
    flights_matched: int | None,
    average_delay_minutes: float | None,
    on_time_percentage: float | None,
    cancelled_count: int | None,
    source_dataset_id: str,
    source_release_id: str,
    methodology_version: str,
) -> str:
    cur.execute(
        """
        INSERT INTO punctuality_metrics
            (id, year, month, airport_id, destination_airport_id, flights_matched,
             average_delay_minutes, on_time_percentage, cancelled_count,
             source_dataset_id, source_release_id, methodology_version, created_at, updated_at)
        VALUES
            (gen_random_uuid()::text, %(year)s, %(month)s, %(airport_id)s, %(destination_airport_id)s,
             %(flights_matched)s, %(average_delay_minutes)s, %(on_time_percentage)s, %(cancelled_count)s,
             %(source_dataset_id)s, %(source_release_id)s, %(methodology_version)s, now(), now())
        RETURNING id
        """,
        {
            "year": year,
            "month": month,
            "airport_id": airport_id,
            "destination_airport_id": destination_airport_id,
            "flights_matched": flights_matched,
            "average_delay_minutes": average_delay_minutes,
            "on_time_percentage": on_time_percentage,
            "cancelled_count": cancelled_count,
            "source_dataset_id": source_dataset_id,
            "source_release_id": source_release_id,
            "methodology_version": methodology_version,
        },
    )
    row = cur.fetchone()
    assert row is not None
    return str(row[0])


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
    return "upserted"
