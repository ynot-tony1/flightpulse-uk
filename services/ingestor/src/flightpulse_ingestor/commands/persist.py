"""Database persistence orchestration.

Wires the adapters' in-memory ParsedRecord output (and the
AirportReferenceAdapter's records) into actual CockroachDB writes, using
the upsert helpers in database/upserts.py. Kept separate from the adapters
themselves so parsing/validation stays testable without a live database
(see adapters/*.py — none of them import psycopg).
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import psycopg
import yaml

from flightpulse_ingestor.adapters.airport_reference import ReferenceAirportRecord
from flightpulse_ingestor.adapters.base import AdapterRunResult
from flightpulse_ingestor.database import upserts
from flightpulse_ingestor.normalisation.names import AirportAliasRegistry, normalise_name


@dataclass
class PersistSummary:
    rows_inserted: int = 0
    rows_updated: int = 0
    rows_skipped: int = 0


def _s(payload: dict[str, object], key: str) -> str:
    value = payload[key]
    assert isinstance(value, str), f"{key!r} expected str, got {type(value)!r}"
    return value


def _s_opt(payload: dict[str, object], key: str) -> str | None:
    value = payload.get(key)
    if value is None:
        return None
    assert isinstance(value, str), f"{key!r} expected str, got {type(value)!r}"
    return value


def _f(payload: dict[str, object], key: str) -> float:
    value = payload[key]
    assert isinstance(value, (int, float)), f"{key!r} expected number, got {type(value)!r}"
    return float(value)


def _f_opt(payload: dict[str, object], key: str) -> float | None:
    value = payload.get(key)
    if value is None:
        return None
    assert isinstance(value, (int, float)), f"{key!r} expected number, got {type(value)!r}"
    return float(value)


def _i_opt(payload: dict[str, object], key: str) -> int | None:
    value = payload.get(key)
    if value is None:
        return None
    assert isinstance(value, (int, float)), f"{key!r} expected number, got {type(value)!r}"
    return int(value)


def _load_source_registry_entry(config_dir: Path, dataset_code: str) -> dict[str, Any]:
    raw = yaml.safe_load((config_dir / "source-registry.yml").read_text(encoding="utf-8"))
    for entry in raw["sources"]:
        if entry["dataset_code"] == dataset_code:
            result: dict[str, Any] = entry
            return result
    raise KeyError(f"dataset_code {dataset_code!r} not found in source-registry.yml")


def ensure_source_dataset(cur: psycopg.Cursor, config_dir: Path, dataset_code: str) -> str:
    entry = _load_source_registry_entry(config_dir, dataset_code)
    return upserts.upsert_source_dataset(
        cur,
        dataset_code=entry["dataset_code"],
        source_organisation=entry["source_organisation"],
        dataset_name=entry["dataset_name"],
        data_family=entry["data_family"],
        official_url=entry["official_url"],
        licence_or_terms_url=entry["licence_or_terms_url"],
        required_attribution=entry["required_attribution"],
        update_frequency=entry["update_frequency"],
    )


def ensure_source_release(
    cur: psycopg.Cursor,
    *,
    source_dataset_id: str,
    year: int,
    month: int,
    result: AdapterRunResult,
) -> str:
    """One release row per import batch, checksummed from the combined
    per-table checksums so a revised CAA file produces a different
    checksum and is detected as a new release."""
    combined = hashlib.sha256()
    total_size = 0
    for d in result.downloads:
        combined.update(d.checksum_sha256.encode())
        total_size += d.size_bytes
    checksum = combined.hexdigest() if result.downloads else hashlib.sha256(b"empty").hexdigest()
    source_url = result.discovered_links[0].url if result.discovered_links else "unknown"

    return upserts.upsert_source_release(
        cur,
        source_dataset_id=source_dataset_id,
        year=year,
        month=month,
        source_url=source_url,
        download_url=source_url,
        checksum_sha256=checksum,
        file_size_bytes=total_size,
        status="imported",
        rows_imported=len(result.records),
    )


def persist_airport_reference(
    conn: psycopg.Connection,
    *,
    reference_records: list[ReferenceAirportRecord],
    alias_registry: AirportAliasRegistry,
) -> PersistSummary:
    """Creates Airport rows for every reviewed alias entry that has a
    matching OurAirports reference record (matched by ICAO first, per
    section 11 — never by fuzzy name matching)."""
    summary = PersistSummary()
    by_icao = {r.icao_code: r for r in reference_records if r.icao_code}

    with conn.cursor() as cur:
        for entry in alias_registry.reviewed_entries():
            ref = by_icao.get(entry.icao) if entry.icao else None
            if ref is None:
                summary.rows_skipped += 1
                continue

            display_name = ref.name.title() if ref.name else entry.caa_name.title()
            upserts.upsert_airport(
                cur,
                canonical_code=entry.canonical_code,
                iata_code=entry.iata,
                icao_code=entry.icao,
                caa_name=entry.caa_name,
                display_name=display_name,
                normalised_name=normalise_name(entry.caa_name),
                municipality=ref.municipality,
                country_code="GB",
                country_name="United Kingdom",
                latitude=ref.latitude,
                longitude=ref.longitude,
                elevation_ft=ref.elevation_ft,
                airport_type=ref.airport_type,
                caa_reporting_airport=True,
            )
            summary.rows_inserted += 1
        conn.commit()
    return summary


def persist_airport_statistics(conn: psycopg.Connection, config_dir: Path, result: AdapterRunResult) -> PersistSummary:
    summary = PersistSummary()
    year, month = result.period

    with conn.cursor() as cur:
        dataset_id = ensure_source_dataset(cur, config_dir, "caa_airport_statistics")
        release_id = ensure_source_release(cur, source_dataset_id=dataset_id, year=year, month=month, result=result)

        for record in result.records:
            payload = record.payload
            if record.kind == "airport_monthly_metric":
                airport_id = upserts.get_airport_id(cur, canonical_code=_s(payload, "canonical_code"))
                if airport_id is None:
                    summary.rows_skipped += 1
                    continue
                outcome = upserts.upsert_airport_monthly_metric(
                    cur,
                    airport_id=airport_id,
                    year=year,
                    month=month,
                    metric_code=_s(payload, "metric_code"),
                    value=_f(payload, "value"),
                    unit=_s(payload, "unit"),
                    source_dataset_id=dataset_id,
                    source_release_id=release_id,
                )
                _tally(summary, outcome)

            elif record.kind == "route_monthly_metric":
                origin_id = upserts.get_airport_id(cur, canonical_code=_s(payload, "origin_canonical_code"))
                dest_id = upserts.get_airport_id(cur, canonical_code=_s(payload, "destination_canonical_code"))
                if origin_id is None or dest_id is None:
                    summary.rows_skipped += 1
                    continue
                route_id = upserts.upsert_route(
                    cur,
                    origin_airport_id=origin_id,
                    destination_airport_id=dest_id,
                    route_type=_s(payload, "route_type"),
                    distance_km=None,
                )
                outcome = upserts.upsert_route_monthly_metric(
                    cur,
                    route_id=route_id,
                    year=year,
                    month=month,
                    passengers=_f_opt(payload, "passengers"),
                    flights=None,
                    freight_tonnes=None,
                    source_table=_s(payload, "source_table"),
                    source_dataset_id=dataset_id,
                    source_release_id=release_id,
                )
                _tally(summary, outcome)
        conn.commit()
    return summary


def persist_punctuality(conn: psycopg.Connection, config_dir: Path, result: AdapterRunResult) -> PersistSummary:
    summary = PersistSummary()
    year, month = result.period

    with conn.cursor() as cur:
        dataset_id = ensure_source_dataset(cur, config_dir, "caa_punctuality_statistics")
        release_id = ensure_source_release(cur, source_dataset_id=dataset_id, year=year, month=month, result=result)

        upserts.delete_punctuality_for_period(cur, year=year, month=month)

        for record in result.records:
            payload = record.payload
            canonical_code = _s(payload, "canonical_code")
            airport_id = upserts.get_airport_id(cur, canonical_code=canonical_code)
            if airport_id is None:
                summary.rows_skipped += 1
                continue
            destination_id = None
            destination_code = _s_opt(payload, "destination_canonical_code")
            if destination_code:
                destination_id = upserts.get_airport_id(cur, canonical_code=destination_code)

            upserts.upsert_punctuality_metric(
                cur,
                year=year,
                month=month,
                airport_id=airport_id,
                destination_airport_id=destination_id,
                flights_matched=_i_opt(payload, "flights_matched"),
                average_delay_minutes=_f_opt(payload, "average_delay_minutes"),
                on_time_percentage=_f_opt(payload, "on_time_percentage"),
                cancelled_count=_i_opt(payload, "cancelled_count"),
                source_dataset_id=dataset_id,
                source_release_id=release_id,
                methodology_version=_s(payload, "methodology_version"),
            )
            upserts.mark_punctuality_monitored(cur, canonical_code=canonical_code)
            summary.rows_inserted += 1
        conn.commit()
    return summary


def persist_airlines(conn: psycopg.Connection, config_dir: Path, result: AdapterRunResult) -> PersistSummary:
    summary = PersistSummary()
    year, month = result.period

    with conn.cursor() as cur:
        dataset_id = ensure_source_dataset(cur, config_dir, "caa_airline_statistics")
        release_id = ensure_source_release(cur, source_dataset_id=dataset_id, year=year, month=month, result=result)

        for record in result.records:
            payload = record.payload
            canonical_name = _s(payload, "canonical_name")
            airline_id = upserts.upsert_airline(
                cur,
                canonical_name=canonical_name,
                normalised_name=normalise_name(canonical_name),
                caa_name=canonical_name,
                iata_code=None,
            )
            outcome = upserts.upsert_airline_monthly_metric(
                cur,
                airline_id=airline_id,
                year=year,
                month=month,
                metric_code=_s(payload, "metric_code"),
                value=_f(payload, "value"),
                unit=_s(payload, "unit"),
                service_category=_s_opt(payload, "service_category"),
                source_dataset_id=dataset_id,
                source_release_id=release_id,
            )
            _tally(summary, outcome)
        conn.commit()
    return summary


def _tally(summary: PersistSummary, outcome: str) -> None:
    if outcome == "inserted":
        summary.rows_inserted += 1
    else:
        summary.rows_updated += 1
