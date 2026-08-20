"""CAAPunctualityAdapter.

Imports two CAA punctuality tables:

- "Summary Analysis": Reporting Airport x Origin/Destination, but verified
  live across several 2025-2026 months (2026-08-20) to contain only three
  Origin/Destination values in practice — "AIRPORT TOTAL", "SCHEDULED
  FLIGHTS(ALL ROUTES)" and "CHARTERED FLIGHTS(ALL ROUTES)" — never a named
  destination. It is airport-level only; an earlier version of this
  docstring claimed named-destination rows existed here, which was never
  actually true for any file checked.
- "Full Analysis": the real source of route-level detail — one row per
  reporting airport x destination x airline x scheduled/charter. Grouped
  here into one flight-weighted record per (reporting airport, destination)
  per period (see docs/methodology.md#punctuality — Σ(delay × flights) /
  Σ(flights), never a plain average of pre-aggregated percentages),
  discarding the airline dimension for now rather than resolving every
  airline that ever operated a UK route (a much larger alias-matching
  surface than the ~25 airlines already reviewed for airline-statistics).

Coverage is inherently partial — only airports CAA actually monitors appear
in the source file, and this adapter does not attempt to fill in the rest
(section 8: "do not fabricate punctuality statistics for airports that are
not represented").
"""

from __future__ import annotations

from dataclasses import dataclass, field
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

# full_analysis ships snake_case headers, unlike summary_analysis's Title
# Case — confirmed live 2026-08-20.
FA_REPORTING_AIRPORT_COL = "reporting_airport"
FA_ORIGIN_DESTINATION_COL = "origin_destination"
FA_FLIGHTS_MATCHED_COL = "number_flights_matched"
FA_CANCELLED_COL = "number_flights_cancelled"
FA_AVERAGE_DELAY_COL = "average_delay_mins"
FA_ON_TIME_BAND_COLS = [
    "flights_15_minutes_early_to_1_minute_early_percent",
    "flights_0_to_15_minutes_late_percent",
]


@dataclass
class _RouteAggregate:
    flights_matched: int = 0
    cancelled_count: int = 0
    delay_weighted_sum: float = 0.0
    delay_weight: int = 0
    on_time_weighted_sum: float = 0.0
    on_time_weight: int = 0
    row_numbers: list[int] = field(default_factory=list)


@dataclass
class PunctualityAdapter:
    dataset_code = "caa_punctuality_statistics"

    client: httpx.Client
    config_dir: Path
    airport_registry: AirportAliasRegistry
    airline_registry: AirlineAliasRegistry  # reserved for a future airline-level breakdown

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

            self._parse_summary_rows(header, rows, result)

        full_links = [link for link in result.discovered_links if link.table_code == "full_analysis"]
        for link in full_links:
            downloaded = download_file(self.client, link.url)
            result.downloads.append(downloaded)
            check_not_html(downloaded.looks_like_html, context=f"punctuality full analysis {year}-{month:02d}")

            header, rows = read_rows(downloaded.content)
            check_not_empty(len(rows), context=f"punctuality full analysis {year}-{month:02d}")

            self._parse_full_analysis_rows(header, rows, result)

        return result

    def _parse_summary_rows(self, header: list[str], rows: list[dict[str, str]], result: AdapterRunResult) -> None:
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
            if not is_airport_level:
                # In practice this table only ever carries "AIRPORT TOTAL"
                # plus "SCHEDULED/CHARTERED FLIGHTS(ALL ROUTES)" aggregate
                # rows — see module docstring. Route-level detail comes from
                # full_analysis instead; skip anything else here rather than
                # guessing at a destination.
                result.validation.reject(i, ORIGIN_DESTINATION_COL, f"not an airport total row: {origin_destination!r}")
                continue

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
                        "destination_canonical_code": None,
                        "flights_matched": flights_matched,
                        "cancelled_count": cancelled_count,
                        "average_delay_minutes": average_delay,
                        "on_time_percentage": on_time_pct,
                        "methodology_version": METHODOLOGY_VERSION,
                    },
                    source_row_number=i,
                )
            )

    def _parse_full_analysis_rows(
        self, header: list[str], rows: list[dict[str, str]], result: AdapterRunResult
    ) -> None:
        if FA_REPORTING_AIRPORT_COL not in header or FA_ORIGIN_DESTINATION_COL not in header:
            result.validation.reject(None, FA_REPORTING_AIRPORT_COL, f"unexpected full_analysis header: {header}")
            return

        on_time_cols = [c for c in FA_ON_TIME_BAND_COLS if c in header]
        aggregates: dict[tuple[str, str], _RouteAggregate] = {}

        for i, row in enumerate(rows):
            result.validation.rows_seen += 1
            caa_airport_name = row.get(FA_REPORTING_AIRPORT_COL, "").strip()
            if not caa_airport_name:
                result.validation.reject(i, FA_REPORTING_AIRPORT_COL, "blank reporting airport")
                continue
            airport_alias = self.airport_registry.resolve(caa_airport_name)
            if airport_alias is None:
                result.unresolved_names.add(caa_airport_name)
                result.validation.reject(i, FA_REPORTING_AIRPORT_COL, f"unresolved airport name: {caa_airport_name!r}")
                continue

            destination_raw = row.get(FA_ORIGIN_DESTINATION_COL, "").strip()
            if not destination_raw:
                result.validation.reject(i, FA_ORIGIN_DESTINATION_COL, "blank destination")
                continue
            dest_alias = self.airport_registry.resolve(destination_raw)
            if dest_alias is None:
                # Overwhelmingly international destinations we don't track
                # (this table has ~3-4k rows/month across every country UK
                # airports fly to) — same expected high-rejection shape as
                # the international route tables in caa_airport_statistics.
                result.unresolved_names.add(destination_raw)
                result.validation.reject(i, FA_ORIGIN_DESTINATION_COL, f"unresolved destination: {destination_raw!r}")
                continue

            flights_matched = parse_int(row.get(FA_FLIGHTS_MATCHED_COL))
            if flights_matched is None or not is_non_negative(flights_matched):
                result.validation.reject(
                    i, FA_FLIGHTS_MATCHED_COL, f"invalid flights_matched: {row.get(FA_FLIGHTS_MATCHED_COL)!r}"
                )
                continue
            if flights_matched == 0:
                # Airline filed a return with zero matched flights this
                # period — a valid row, just nothing to aggregate.
                continue
            cancelled_count = parse_int(row.get(FA_CANCELLED_COL)) or 0
            average_delay = parse_number(row.get(FA_AVERAGE_DELAY_COL)) if FA_AVERAGE_DELAY_COL in header else None

            on_time_pct = None
            if on_time_cols:
                band_values = [parse_percentage(row.get(c)) for c in on_time_cols]
                if all(v is not None for v in band_values):
                    on_time_pct = sum(v for v in band_values if v is not None)
                    if not is_valid_percentage(on_time_pct):
                        on_time_pct = None

            result.validation.rows_valid += 1
            key = (airport_alias.canonical_code, dest_alias.canonical_code)
            agg = aggregates.setdefault(key, _RouteAggregate())
            agg.flights_matched += flights_matched
            agg.cancelled_count += cancelled_count
            agg.row_numbers.append(i)
            if average_delay is not None:
                agg.delay_weighted_sum += average_delay * flights_matched
                agg.delay_weight += flights_matched
            if on_time_pct is not None:
                agg.on_time_weighted_sum += on_time_pct * flights_matched
                agg.on_time_weight += flights_matched

        for (origin_code, destination_code), agg in aggregates.items():
            result.records.append(
                ParsedRecord(
                    kind="punctuality_metric",
                    payload={
                        "canonical_code": origin_code,
                        "destination_canonical_code": destination_code,
                        "flights_matched": agg.flights_matched,
                        "cancelled_count": agg.cancelled_count,
                        "average_delay_minutes": (
                            agg.delay_weighted_sum / agg.delay_weight if agg.delay_weight > 0 else None
                        ),
                        "on_time_percentage": (
                            agg.on_time_weighted_sum / agg.on_time_weight if agg.on_time_weight > 0 else None
                        ),
                        "methodology_version": METHODOLOGY_VERSION,
                    },
                    source_row_number=agg.row_numbers[0],
                )
            )
