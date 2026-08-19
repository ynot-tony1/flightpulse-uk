"""CAAAirportStatisticsAdapter.

Discovers and imports the allowlisted CAA "UK Airport Data" CSV tables
(config/caa-tables.yml -> airport_statistics). Column names below were
confirmed by downloading live December-2025 CSV files on 2026-08-19 (see
`ingestor inspect` for the command used) — CAA's machine column names differ
noticeably from the human-readable table titles, and table_10_1 even uses a
different naming convention (`rpt_apt_name`) to every other table
(`reporting_airport_name`), which is exactly why this adapter matches by an
explicit candidate list per table rather than assuming one shared layout.

See docs/methodology.md#domestic-route-double-counting for why table_12_2
(canonical, 200 undirected pairs in the Dec-2025 file) and table_12_3
(airport-centric, 363 rows for the same period) are handled differently even
though both describe domestic routes.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import httpx
import yaml

from flightpulse_ingestor.adapters.base import AdapterRunResult, ParsedRecord
from flightpulse_ingestor.discovery import MONTH_NAMES, DiscoveredLink, discover_table_links, month_page_url
from flightpulse_ingestor.http_client import download_file
from flightpulse_ingestor.normalisation.names import AirportAliasRegistry
from flightpulse_ingestor.parsers.csv_reader import read_rows
from flightpulse_ingestor.validation.parsing import parse_number
from flightpulse_ingestor.validation.rules import check_not_empty, check_not_html, is_non_negative

# Confirmed 2025/2026 machine column names for the airport-identity column,
# in priority order. table_10_1 alone uses the abbreviated `rpt_apt_name`.
AIRPORT_COLUMN_CANDIDATES = ["reporting_airport_name", "rpt_apt_name", "airport_name"]

# table_code -> list of (metric_code, unit, value_column)
METRIC_TABLE_MAP: dict[str, list[tuple[str, str, str]]] = {
    "table_03": [("aircraft_movements_total", "movements", "grand_total")],
    "table_09": [
        ("terminal_passengers", "passengers", "terminal_pax_this_period"),
        ("transit_passengers", "passengers", "transit_pax_this_period"),
    ],
    "table_10_1": [("international_passengers", "passengers", "total_pax_tp")],
    "table_10_2": [("domestic_passengers", "passengers", "total_pax_this_period")],
    "table_13": [("freight_tonnes", "tonnes", "total_freight")],
}

# table_12_1: directional UK -> foreign route (international)
# table_12_2: canonical, undirected domestic airport-pair route
ROUTE_TABLES = {"table_12_1", "table_12_2"}


@dataclass
class AirportStatisticsAdapter:
    dataset_code = "caa_airport_statistics"

    client: httpx.Client
    config_dir: Path
    alias_registry: AirportAliasRegistry

    def _table_allowlist(self) -> dict[str, str]:
        raw = yaml.safe_load((self.config_dir / "caa-tables.yml").read_text(encoding="utf-8"))
        tables = raw["airport_statistics"]["tables"]
        return {code: meta["name"] for code, meta in tables.items()}

    def discover(self, year: int, month: int) -> list[DiscoveredLink]:
        index_url = month_page_url("airports", year, MONTH_NAMES[month - 1])
        return discover_table_links(self.client, index_url, self._table_allowlist())

    def run(self, year: int, month: int, *, dry_run: bool = False) -> AdapterRunResult:
        result = AdapterRunResult(dataset_code=self.dataset_code, period=(year, month))
        result.discovered_links = self.discover(year, month)

        for link in result.discovered_links:
            if link.table_code not in METRIC_TABLE_MAP and link.table_code not in ROUTE_TABLES:
                continue  # e.g. table_01 (ranking, not a per-airport metric) or table_12_3 (airport-centric only)

            downloaded = download_file(self.client, link.url)
            result.downloads.append(downloaded)
            check_not_html(downloaded.looks_like_html, context=f"{link.table_code} {year}-{month:02d}")

            header, rows = read_rows(downloaded.content)
            check_not_empty(len(rows), context=f"{link.table_code} {year}-{month:02d}")

            if link.table_code in ROUTE_TABLES:
                self._parse_route_rows(header, rows, result, table_code=link.table_code)
            else:
                self._parse_metric_rows(header, rows, result, table_code=link.table_code)

        return result

    def _airport_column(self, header: list[str]) -> str | None:
        return next((c for c in AIRPORT_COLUMN_CANDIDATES if c in header), None)

    def _parse_metric_rows(
        self,
        header: list[str],
        rows: list[dict[str, str]],
        result: AdapterRunResult,
        *,
        table_code: str,
    ) -> None:
        airport_col = self._airport_column(header)
        if airport_col is None:
            result.validation.reject(None, "header", f"{table_code}: no recognised airport column in {header}")
            return

        metrics = METRIC_TABLE_MAP[table_code]
        applicable_metrics = [(code, unit, col) for code, unit, col in metrics if col in header]
        if not applicable_metrics:
            result.validation.reject(
                None, "header", f"{table_code}: none of the expected value columns found in {header}"
            )
            return

        for i, row in enumerate(rows):
            result.validation.rows_seen += 1
            caa_name = row.get(airport_col, "").strip()
            if not caa_name:
                result.validation.reject(i, airport_col, "blank airport name")
                continue

            alias = self.alias_registry.resolve(caa_name)
            if alias is None:
                if not self.alias_registry.is_known_unresolved(caa_name):
                    result.unresolved_names.add(caa_name)
                result.validation.reject(i, airport_col, f"unresolved airport name: {caa_name!r}")
                continue

            row_had_valid_metric = False
            for metric_code, unit, value_col in applicable_metrics:
                value = parse_number(row.get(value_col))
                if value is None or not is_non_negative(value):
                    continue
                row_had_valid_metric = True
                result.records.append(
                    ParsedRecord(
                        kind="airport_monthly_metric",
                        payload={
                            "canonical_code": alias.canonical_code,
                            "metric_code": metric_code,
                            "value": value,
                            "unit": unit,
                            "source_table": table_code,
                        },
                        source_row_number=i,
                    )
                )

            if row_had_valid_metric:
                result.validation.rows_valid += 1
            else:
                result.validation.reject(i, "value", "no valid metric values in row")

    def _parse_route_rows(
        self,
        header: list[str],
        rows: list[dict[str, str]],
        result: AdapterRunResult,
        *,
        table_code: str,
    ) -> None:
        if table_code == "table_12_1":
            origin_col, dest_col, route_type = "UK_airport", "foreign_airport", "international"
        else:  # table_12_2
            origin_col, dest_col, route_type = "airport_1_name", "airport_2_name", "domestic"

        if origin_col not in header or dest_col not in header:
            result.validation.reject(None, "header", f"{table_code}: expected {origin_col}/{dest_col} in {header}")
            return

        for i, row in enumerate(rows):
            result.validation.rows_seen += 1
            origin_name = row.get(origin_col, "").strip()
            dest_name = row.get(dest_col, "").strip()
            if not origin_name or not dest_name:
                result.validation.reject(i, origin_col, "blank origin/destination")
                continue

            origin_alias = self.alias_registry.resolve(origin_name)
            dest_alias = self.alias_registry.resolve(dest_name)
            if origin_alias is None:
                result.unresolved_names.add(origin_name)
            if dest_alias is None:
                result.unresolved_names.add(dest_name)
            if origin_alias is None or dest_alias is None:
                result.validation.reject(i, origin_col, f"unresolved route endpoint: {origin_name!r} / {dest_name!r}")
                continue

            passengers = parse_number(row.get("total_pax_this_period"))
            if passengers is None or not is_non_negative(passengers):
                result.validation.reject(i, "total_pax_this_period", "invalid passenger value")
                continue

            result.validation.rows_valid += 1
            result.records.append(
                ParsedRecord(
                    kind="route_monthly_metric",
                    payload={
                        "origin_canonical_code": origin_alias.canonical_code,
                        "destination_canonical_code": dest_alias.canonical_code,
                        "route_type": route_type,
                        "passengers": passengers,
                        "source_table": table_code,
                    },
                    source_row_number=i,
                )
            )
