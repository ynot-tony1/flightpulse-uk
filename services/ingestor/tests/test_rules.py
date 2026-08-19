import pytest

from flightpulse_ingestor.validation.rules import (
    SuspiciousChangeError,
    check_expected_headers,
    check_not_empty,
    check_not_html,
    check_total_collapse,
    is_valid_latitude,
    is_valid_longitude,
    is_valid_percentage,
)


def test_check_not_empty_raises_on_zero_rows():
    with pytest.raises(SuspiciousChangeError):
        check_not_empty(0, context="test")
    check_not_empty(1, context="test")  # does not raise


def test_check_not_html_raises_when_html_detected():
    with pytest.raises(SuspiciousChangeError):
        check_not_html(True, context="test")


def test_check_expected_headers_raises_on_missing_column():
    with pytest.raises(SuspiciousChangeError):
        check_expected_headers({"A", "B"}, {"A", "C"}, context="test")
    check_expected_headers({"A", "B", "C"}, {"A", "C"}, context="test")  # does not raise


def test_check_total_collapse_raises_on_large_drop():
    with pytest.raises(SuspiciousChangeError):
        check_total_collapse(1_000_000, 100_000, context="test")
    check_total_collapse(1_000_000, 950_000, context="test")  # small drop, fine
    check_total_collapse(None, 100, context="test")  # no baseline yet, fine


@pytest.mark.parametrize(
    "value,expected",
    [(0, True), (100, True), (50.5, True), (-1, False), (101, False)],
)
def test_is_valid_percentage(value, expected):
    assert is_valid_percentage(value) is expected


def test_lat_lon_bounds():
    assert is_valid_latitude(90) and is_valid_latitude(-90) and not is_valid_latitude(91)
    assert is_valid_longitude(180) and is_valid_longitude(-180) and not is_valid_longitude(181)
