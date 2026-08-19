from pathlib import Path

from flightpulse_ingestor.normalisation.names import AirportAliasRegistry, normalise_name

FIXTURES = Path(__file__).parent / "fixtures"


def test_normalise_name_strips_punctuation_and_case():
    assert normalise_name("London Heathrow.") == "LONDON HEATHROW"
    assert normalise_name("  Belfast  City  ") == "BELFAST CITY"


def test_registry_resolves_known_airport():
    registry = AirportAliasRegistry.load(FIXTURES / "airport-aliases.test.yml")
    entry = registry.resolve("TEST AIRPORT A")
    assert entry is not None
    assert entry.canonical_code == "TSA"
    assert entry.match_method == "icao"


def test_registry_is_case_and_whitespace_insensitive():
    registry = AirportAliasRegistry.load(FIXTURES / "airport-aliases.test.yml")
    assert registry.resolve("test   airport a") is not None


def test_registry_returns_none_for_unknown_airport_without_guessing():
    registry = AirportAliasRegistry.load(FIXTURES / "airport-aliases.test.yml")
    assert registry.resolve("SOME COMPLETELY UNKNOWN AIRPORT") is None
