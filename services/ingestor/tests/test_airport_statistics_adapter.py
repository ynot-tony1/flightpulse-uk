from pathlib import Path

import httpx

from flightpulse_ingestor.adapters.base import AdapterRunResult
from flightpulse_ingestor.adapters.caa_airport_statistics import AirportStatisticsAdapter
from flightpulse_ingestor.normalisation.names import AirportAliasRegistry
from flightpulse_ingestor.parsers.csv_reader import read_rows

FIXTURES = Path(__file__).parent / "fixtures"
CONFIG_DIR = Path(__file__).parents[3] / "config"


def _adapter() -> AirportStatisticsAdapter:
    registry = AirportAliasRegistry.load(FIXTURES / "airport-aliases.test.yml")
    return AirportStatisticsAdapter(client=httpx.Client(), config_dir=CONFIG_DIR, alias_registry=registry)


def test_parse_metric_rows_table_09_produces_two_metrics_per_airport():
    adapter = _adapter()
    header, rows = read_rows((FIXTURES / "table_09_real_schema.csv").read_bytes())
    result = AdapterRunResult(dataset_code="caa_airport_statistics", period=(2025, 12))

    adapter._parse_metric_rows(header, rows, result, table_code="table_09")

    assert result.validation.rows_seen == 3
    assert result.validation.rows_valid == 2  # TEST AIRPORT A and B resolve; UNKNOWN does not
    assert "UNKNOWN TEST AIRPORT" in result.unresolved_names

    metric_codes = {r.payload["metric_code"] for r in result.records}
    assert metric_codes == {"terminal_passengers", "transit_passengers"}

    airport_a_terminal = next(
        r
        for r in result.records
        if r.payload["canonical_code"] == "TSA" and r.payload["metric_code"] == "terminal_passengers"
    )
    assert airport_a_terminal.payload["value"] == 119500.0


def test_parse_route_rows_table_12_2_is_undirected_domestic():
    adapter = _adapter()
    header, rows = read_rows((FIXTURES / "table_12_2_real_schema.csv").read_bytes())
    result = AdapterRunResult(dataset_code="caa_airport_statistics", period=(2025, 12))

    adapter._parse_route_rows(header, rows, result, table_code="table_12_2")

    assert result.validation.rows_valid == 1
    record = result.records[0]
    assert record.kind == "route_monthly_metric"
    assert record.payload["route_type"] == "domestic"
    assert record.payload["origin_canonical_code"] == "TSA"
    assert record.payload["destination_canonical_code"] == "TSB"
    assert record.payload["passengers"] == 1164.0
