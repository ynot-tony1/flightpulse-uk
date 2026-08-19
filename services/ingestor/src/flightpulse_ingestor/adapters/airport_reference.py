"""AirportReferenceAdapter.

Downloads the OurAirports airports.csv snapshot for geographic metadata
only (lat/lon/ICAO/IATA/municipality/type). Never used to override CAA
statistics — see docs/data-sources.md.

Matching to a canonical FlightPulse airport uses ICAO first, then IATA,
never a fuzzy name match (section 11).
"""

from __future__ import annotations

from dataclasses import dataclass

import httpx

from flightpulse_ingestor.http_client import download_file
from flightpulse_ingestor.validation.rules import (
    check_not_empty,
    check_not_html,
    is_valid_latitude,
    is_valid_longitude,
)

OURAIRPORTS_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv"

RELEVANT_TYPES = {"large_airport", "medium_airport", "small_airport"}


@dataclass
class ReferenceAirportRecord:
    icao_code: str | None
    iata_code: str | None
    name: str
    municipality: str | None
    country_code: str
    airport_type: str
    latitude: float
    longitude: float
    elevation_ft: int | None


@dataclass
class AirportReferenceAdapter:
    dataset_code = "ourairports_reference"

    client: httpx.Client

    def fetch_uk_airports(self) -> list[ReferenceAirportRecord]:
        downloaded = download_file(self.client, OURAIRPORTS_URL)
        check_not_html(downloaded.looks_like_html, context="OurAirports airports.csv")

        import csv
        import io

        text = downloaded.content.decode("utf-8")
        reader = csv.DictReader(io.StringIO(text))
        rows = [row for row in reader if row.get("iso_country") == "GB"]
        check_not_empty(len(rows), context="OurAirports airports.csv (GB rows)")

        records: list[ReferenceAirportRecord] = []
        for row in rows:
            if row.get("type") not in RELEVANT_TYPES:
                continue
            try:
                lat = float(row["latitude_deg"])
                lon = float(row["longitude_deg"])
            except (KeyError, ValueError):
                continue
            if not (is_valid_latitude(lat) and is_valid_longitude(lon)):
                continue

            elevation_raw = row.get("elevation_ft") or ""
            records.append(
                ReferenceAirportRecord(
                    icao_code=(row.get("icao_code") or "").strip() or None,
                    iata_code=(row.get("iata_code") or "").strip() or None,
                    name=row.get("name", "").strip(),
                    municipality=(row.get("municipality") or "").strip() or None,
                    country_code="GB",
                    airport_type=row["type"],
                    latitude=lat,
                    longitude=lon,
                    elevation_ft=int(elevation_raw) if elevation_raw.strip().lstrip("-").isdigit() else None,
                )
            )
        return records
