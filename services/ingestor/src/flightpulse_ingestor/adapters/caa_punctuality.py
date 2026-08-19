"""CAAPunctualityAdapter.

Imports the CAA "Punctuality Statistics Summary Analysis" CSV. Column names
below were confirmed against a live January-2026 file on 2026-08-19: the
summary file has no airline column at all — it is Reporting Airport x
Origin/Destination, with an "AIRPORT TOTAL" sentinel row per airport for the
airport-level aggregate and named-destination rows for route-level detail.
Airline-level punctuality would require the (currently unwired) full-analysis
tables — see config/caa-tables.yml.

Coverage is inherently partial — only airports CAA actually monitors appear
in the source file, and this adapter does not attempt to fill in the rest
(section 8: "do not fabricate punctuality statistics for airports that are
not represented").
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import httpx
import yaml

from flightpulse_ingestor.adapters.base import AdapterRunResult, ParsedRecord
from flightpulse_ingestor.discovery import DiscoveredLink, discover_table_links, punctuality_year_url
from flightpulse_ingestor.http_client import download_file
from flightpulse_ingestor.normalisation.names import AirlineAliasRegistry, AirportAliasRegistry
from flightpulse_ingestor.parsers.csv_reader import read_rows
from flightpulse_ingestor.validation.parsing import parse_int, parse_number, parse_percentage
from flightpulse_ingestor.validation.rules import (
    check_not_empty,
    check_not_html,
    is_non_negative,
    is_valid_percentage,
)

METHODOLOGY_VERSION = "2026.1"

AIRPORT_COL = "Reporting Airport"
ORIGIN_DESTINATION_COL = "Origin Destination"
AIRPORT_TOTAL_SENTINEL = "AIRPORT TOTAL"
FLIGHTS_MATCHED_COL = "Number Flights Matched"
CANCELLED_COL = "Number Flights Cancelled"
AVERAGE_DELAY_COL = "Average Delay Minutes"

# CAA's official on-time window is -15 to +15 minutes versus schedule, which
# in this file is the sum of these two band columns (see
# docs/methodology.md#punctuality).
ON_TIME_BAND_COLS = [
    "Flights 15 minutes early to 1 minute early percent",
    "Flights 0 (zero) to 15 minutes late percent",
]


@dataclass
class PunctualityAdapter:
    dataset_code = "caa_punctuality_statistics"

    client: httpx.Client
    config_dir: Path
    airport_registry: AirportAliasRegistry
    airline_registry: AirlineAliasRegistry  # reserved for the full-analysis tables (not yet wired)

    def _table_allowlist(self) -> dict[str, str]:
        raw = yaml.safe_load((self.config_dir / "caa-tables.yml").read_text(encoding="utf-8"))
        tables = raw["punctuality"]["tables"]
        return {code: meta["name"] for code, meta in tables.items()}

    def discover(self, year: int, month: int) -> list[DiscoveredLink]:
        index_url = punctuality_year_url(year)
        all_links = discover_table_links(self.client, index_url, self._table_allowlist())
        month_tag = f"{year}{month:02d}"
        return [link for link in all_links if month_tag in link.url or month_tag in link.label_text]

    def run(self, year: int, month: int, *, dry_run: bool = False) -> AdapterRunResult:
        result = AdapterRunResult(dataset_code=self.dataset_code, period=(year, month))
        result.discovered_links = self.discover(year, month)

        summary_links = [link for link in result.discovered_links if link.table_code == "summary_analysis"]
        for link in summary_links:
            downloaded = download_file(self.client, link.url)
            result.downloads.append(downloaded)
            check_not_html(downloaded.looks_like_html, context=f"punctuality summary {year}-{month:02d}")

            header, rows = read_rows(downloaded.content)
            check_not_empty(len(rows), context=f"punctuality summary {year}-{month:02d}")

            self._parse_rows(header, rows, result)

        return result

    def _parse_rows(self, header: list[str], rows: list[dict[str, str]], result: AdapterRunResult) -> None:
        if AIRPORT_COL not in header:
            result.validation.reject(None, AIRPORT_COL, f"no {AIRPORT_COL!r} column in punctuality summary file")
            return

        on_time_cols = [c for c in ON_TIME_BAND_COLS if c in header]

        for i, row in enumerate(rows):
            result.validation.rows_seen += 1
            caa_airport_name = row.get(AIRPORT_COL, "").strip()
            if not caa_airport_name:
                result.validation.reject(i, AIRPORT_COL, "blank airport name")
                continue

            airport_alias = self.airport_registry.resolve(caa_airport_name)
            if airport_alias is None:
                result.unresolved_names.add(caa_airport_name)
                result.validation.reject(i, AIRPORT_COL, f"unresolved airport name: {caa_airport_name!r}")
                continue

            origin_destination = row.get(ORIGIN_DESTINATION_COL, "").strip()
            is_airport_level = origin_destination.upper() == AIRPORT_TOTAL_SENTINEL

            destination_canonical_code = None
            if not is_airport_level and origin_destination:
                dest_alias = self.airport_registry.resolve(origin_destination)
                if dest_alias is None:
                    result.unresolved_names.add(origin_destination)
                    result.validation.reject(
                        i, ORIGIN_DESTINATION_COL, f"unresolved destination: {origin_destination!r}"
                    )
                    continue
                destination_canonical_code = dest_alias.canonical_code

            flights_matched = parse_int(row.get(FLIGHTS_MATCHED_COL))
            cancelled_count = parse_int(row.get(CANCELLED_COL))
            average_delay = parse_number(row.get(AVERAGE_DELAY_COL))

            on_time_pct = None
            if on_time_cols:
                band_values = [parse_percentage(row.get(c)) for c in on_time_cols]
                if all(v is not None for v in band_values):
                    on_time_pct = sum(v for v in band_values if v is not None)

            if flights_matched is not None and not is_non_negative(flights_matched):
                result.validation.reject(i, FLIGHTS_MATCHED_COL, f"negative flights_matched: {flights_matched}")
                continue
            if on_time_pct is not None and not is_valid_percentage(on_time_pct):
                result.validation.reject(i, "on_time_percentage", f"out of range: {on_time_pct}")
                continue

            result.validation.rows_valid += 1
            result.records.append(
                ParsedRecord(
                    kind="punctuality_metric",
                    payload={
                        "canonical_code": airport_alias.canonical_code,
                        "destination_canonical_code": destination_canonical_code,
                        "flights_matched": flights_matched,
                        "cancelled_count": cancelled_count,
                        "average_delay_minutes": average_delay,
                        "on_time_percentage": on_time_pct,
                        "methodology_version": METHODOLOGY_VERSION,
                    },
                    source_row_number=i,
                )
            )
