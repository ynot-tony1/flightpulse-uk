import pytest

from flightpulse_ingestor.validation.parsing import (
    parse_caa_period,
    parse_int,
    parse_number,
    parse_percentage,
)


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("1,234,567", 1234567.0),
        ("  42 ", 42.0),
        ("-", None),
        ("", None),
        ("n/a", None),
        ("12.5[1]", 12.5),
    ],
)
def test_parse_number(raw, expected):
    assert parse_number(raw) == expected


def test_parse_percentage_strips_percent_sign():
    assert parse_percentage("87.3%") == 87.3
    assert parse_percentage(None) is None


def test_parse_int_rounds():
    assert parse_int("41.6") == 42


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("202601", (2026, 1)),
        ("Jan-26", (2026, 1)),
        ("dec-2025", (2025, 12)),
    ],
)
def test_parse_caa_period(raw, expected):
    assert parse_caa_period(raw) == expected


def test_parse_caa_period_rejects_unknown_format():
    with pytest.raises(ValueError):
        parse_caa_period("not a period")
