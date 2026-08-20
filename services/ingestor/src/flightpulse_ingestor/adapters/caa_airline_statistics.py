"""CAAAirlineStatisticsAdapter.

Imports the allowlisted CAA "UK Airline Data" CSV tables
(config/caa-tables.yml -> airline_statistics). Column names below were
confirmed against a live April-2026 Table 03 file on 2026-08-19. Kept
conceptually separate from airport statistics per section 10 — no shared
parsing code path.

Note: the CAA file lists every operator that filed a return that month
(hundreds of rows, many one-off charter/GA operators), not just the small
set of major airlines in config/airline-aliases.yml, so a large proportion
of rows are expected to be "unresolved" until that alias file is expanded —
this is the intended conservative behaviour (section 28), not a bug.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import httpx
import yaml

from flightpulse_ingestor.adapters.base import AdapterRunResult, ParsedRecord
from flightpulse_ingestor.discovery import MONTH_NAMES, DiscoveredLink, discover_table_links, month_page_url
from flightpulse_ingestor.http_client import download_file
from flightpulse_ingestor.normalisation.names import AirlineAliasRegistry
from flightpulse_ingestor.parsers.csv_reader import read_rows
from flightpulse_ingestor.validation.parsing import parse_number
from flightpulse_ingestor.validation.rules import check_not_empty, check_not_html, is_non_negative

AIRLINE_COLUMN_CANDIDATES = ["airline_name", "Airline", "Operator"]

# table_code -> (metric_code, unit, value_column_candidates, service_category)
METRIC_TABLE_MAP: dict[str, tuple[str, str, list[str], str | None]] = {
    "table_03": ("flights_total", "flights", ["no_flights"], None),
    "table_04_all_scheduled": ("flights_total", "flights", ["no_flights"], "scheduled"),
    "table_05_all_non_scheduled": ("flights_total", "flights", ["no_flights"], "non_scheduled"),
    "table_08_1_utilisation_all": (
        "aircraft_utilisation_hours",
        "hours",
        ["aircraft_hours"],
        None,
    ),
}


@dataclass
class AirlineStatisticsAdapter:
    dataset_code = "caa_airline_statistics"

    client: httpx.Client
    config_dir: Path
    airline_registry: AirlineAliasRegistry

    def _table_allowlist(self) -> dict[str, str]:
        raw = yaml.safe_load((self.config_dir / "caa-tables.yml").read_text(encoding="utf-8"))
        tables = raw["airline_statistics"]["tables"]
        return {code: meta["name"] for code, meta in tables.items()}

    def discover(self, year: int, month: int) -> list[DiscoveredLink]:
        index_url = month_page_url("airlines", year, MONTH_NAMES[month - 1])
        return discover_table_links(self.client, index_url, self._table_allowlist())

    def run(self, year: int, month: int, *, dry_run: bool = False) -> AdapterRunResult:
        result = AdapterRunResult(dataset_code=self.dataset_code, period=(year, month))
        result.discovered_links = self.discover(year, month)

        for link in result.discovered_links:
            if link.table_code not in METRIC_TABLE_MAP:
                continue

            downloaded = download_file(self.client, link.url)
            result.downloads.append(downloaded)
            check_not_html(downloaded.looks_like_html, context=f"{link.table_code} {year}-{month:02d}")

            header, rows = read_rows(downloaded.content)
            check_not_empty(len(rows), context=f"{link.table_code} {year}-{month:02d}")

            airline_col = next((c for c in AIRLINE_COLUMN_CANDIDATES if c in header), None)
            metric_code, unit, value_candidates, service_category = METRIC_TABLE_MAP[link.table_code]
            value_col = next((c for c in value_candidates if c in header), None)

            if airline_col is None or value_col is None:
                result.validation.reject(
                    None,
                    "header",
                    f"{link.table_code}: could not identify airline/value columns in {header}",
                )
                continue

            # Some CAA months emit more than one row for the same airline
            # within a single "All Services" style table (seen live for
            # table_03, Jan-Apr 2026: one plausible total plus one row two
            # orders of magnitude smaller). The (airline, year_month) unique
            # constraint on service_category doesn't catch this because it's
            # two distinct rows in one run, not a re-import — so within a
            # single table's rows, keep only the largest value per airline
            # and reject the rest rather than writing conflicting rows.
            best_index_by_airline: dict[str, int] = {}

            for i, row in enumerate(rows):
                result.validation.rows_seen += 1
                caa_name = row.get(airline_col, "").strip()
                if not caa_name:
                    result.validation.reject(i, airline_col, "blank airline name")
                    continue

                alias = self.airline_registry.resolve(caa_name)
                if alias is None:
                    result.unresolved_names.add(caa_name)
                    result.validation.reject(i, airline_col, f"unresolved airline name: {caa_name!r}")
                    continue

                value = parse_number(row.get(value_col))
                if value is None or not is_non_negative(value):
                    result.validation.reject(i, value_col, f"invalid value: {row.get(value_col)!r}")
                    continue

                result.validation.rows_valid += 1
                record = ParsedRecord(
                    kind="airline_monthly_metric",
                    payload={
                        "canonical_name": alias.canonical_name,
                        "metric_code": metric_code,
                        "value": value,
                        "unit": unit,
                        "service_category": service_category,
                        "source_table": link.table_code,
                    },
                    source_row_number=i,
                )

                existing_index = best_index_by_airline.get(alias.canonical_name)
                if existing_index is not None:
                    existing_record = result.records[existing_index]
                    existing_value = existing_record.payload["value"]
                    assert isinstance(existing_value, float)
                    if value <= existing_value:
                        result.validation.reject(
                            i,
                            value_col,
                            f"{link.table_code}: duplicate row for {alias.canonical_name!r} "
                            f"(value {value} <= already-kept value {existing_value})",
                        )
                        continue
                    result.validation.reject(
                        existing_record.source_row_number,
                        value_col,
                        f"{link.table_code}: duplicate row for {alias.canonical_name!r} "
                        f"(value {existing_value} superseded by larger value {value})",
                    )
                    result.records[existing_index] = record
                    continue

                best_index_by_airline[alias.canonical_name] = len(result.records)
                result.records.append(record)

        return result
