from pathlib import Path

import httpx

from flightpulse_ingestor.adapters.base import AdapterRunResult
from flightpulse_ingestor.adapters.caa_punctuality import PunctualityAdapter
from flightpulse_ingestor.normalisation.names import AirlineAliasRegistry, AirportAliasRegistry

FIXTURES = Path(__file__).parent / "fixtures"
CONFIG_DIR = Path(__file__).parents[3] / "config"

FULL_ANALYSIS_HEADER = [
    "reporting_airport",
    "origin_destination",
    "airline_name",
    "number_flights_matched",
    "number_flights_cancelled",
    "average_delay_mins",
    "flights_15_minutes_early_to_1_minute_early_percent",
    "flights_0_to_15_minutes_late_percent",
]


def _adapter() -> PunctualityAdapter:
    return PunctualityAdapter(
        client=httpx.Client(),
        config_dir=CONFIG_DIR,
        airport_registry=AirportAliasRegistry.load(FIXTURES / "airport-aliases.test.yml"),
        airline_registry=AirlineAliasRegistry.load(CONFIG_DIR / "airline-aliases.yml"),
    )


def test_full_analysis_aggregates_multiple_airlines_flight_weighted():
    adapter = _adapter()
    result = AdapterRunResult(dataset_code="caa_punctuality_statistics", period=(2026, 6))

    rows = [
        {
            "reporting_airport": "TEST AIRPORT A",
            "origin_destination": "TEST AIRPORT B",
            "airline_name": "AIRLINE ONE",
            "number_flights_matched": "10",
            "number_flights_cancelled": "0",
            "average_delay_mins": "10",
            "flights_15_minutes_early_to_1_minute_early_percent": "40",
            "flights_0_to_15_minutes_late_percent": "40",
        },
        {
            "reporting_airport": "TEST AIRPORT A",
            "origin_destination": "TEST AIRPORT B",
            "airline_name": "AIRLINE TWO",
            "number_flights_matched": "30",
            "number_flights_cancelled": "1",
            "average_delay_mins": "20",
            "flights_15_minutes_early_to_1_minute_early_percent": "10",
            "flights_0_to_15_minutes_late_percent": "10",
        },
        {
            # International destination — must be excluded, never fabricated.
            "reporting_airport": "TEST AIRPORT A",
            "origin_destination": "SOMEWHERE ABROAD",
            "airline_name": "AIRLINE ONE",
            "number_flights_matched": "50",
            "number_flights_cancelled": "0",
            "average_delay_mins": "5",
            "flights_15_minutes_early_to_1_minute_early_percent": "50",
            "flights_0_to_15_minutes_late_percent": "50",
        },
    ]

    adapter._parse_full_analysis_rows(FULL_ANALYSIS_HEADER, rows, result)

    assert len(result.records) == 1
    record = result.records[0]
    assert record.payload["canonical_code"] == "TSA"
    assert record.payload["destination_canonical_code"] == "TSB"
    assert record.payload["flights_matched"] == 40
    assert record.payload["cancelled_count"] == 1
    # Flight-weighted, not a plain average: (10*10 + 20*30) / 40 = 17.5
    assert record.payload["average_delay_minutes"] == 17.5
    # (80*10 + 20*30) / 40 = 35.0
    assert record.payload["on_time_percentage"] == 35.0


def test_full_analysis_skips_zero_flights_and_unresolved_airports():
    adapter = _adapter()
    result = AdapterRunResult(dataset_code="caa_punctuality_statistics", period=(2026, 6))

    rows = [
        {
            "reporting_airport": "TEST AIRPORT A",
            "origin_destination": "TEST AIRPORT B",
            "airline_name": "AIRLINE ONE",
            "number_flights_matched": "0",
            "number_flights_cancelled": "0",
            "average_delay_mins": "10",
            "flights_15_minutes_early_to_1_minute_early_percent": "50",
            "flights_0_to_15_minutes_late_percent": "50",
        },
        {
            "reporting_airport": "UNKNOWN REPORTING AIRPORT",
            "origin_destination": "TEST AIRPORT B",
            "airline_name": "AIRLINE ONE",
            "number_flights_matched": "5",
            "number_flights_cancelled": "0",
            "average_delay_mins": "10",
            "flights_15_minutes_early_to_1_minute_early_percent": "50",
            "flights_0_to_15_minutes_late_percent": "50",
        },
    ]

    adapter._parse_full_analysis_rows(FULL_ANALYSIS_HEADER, rows, result)

    assert result.records == []
    assert "UNKNOWN REPORTING AIRPORT" in result.unresolved_names
