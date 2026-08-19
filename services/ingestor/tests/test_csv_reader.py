from pathlib import Path

from flightpulse_ingestor.parsers.csv_reader import read_rows

FIXTURES = Path(__file__).parent / "fixtures"


def test_read_rows_skips_title_and_footnote_lines():
    raw = (FIXTURES / "table_09_terminal_passengers.csv").read_bytes()
    header, rows = read_rows(raw)

    assert header == ["Airport", "Terminal Passengers", "Transit Passengers"]
    assert len(rows) == 3
    assert rows[0]["Airport"] == "TEST AIRPORT A"
    assert rows[0]["Terminal Passengers"] == "120000"


def test_read_rows_handles_blank_input():
    header, rows = read_rows(b"")
    assert header == []
    assert rows == []


def test_read_rows_pads_short_rows():
    raw = b"A,B,C\n1,2\n"
    header, rows = read_rows(raw, min_columns=1)
    assert header == ["A", "B", "C"]
    assert rows[0] == {"A": "1", "B": "2", "C": ""}
