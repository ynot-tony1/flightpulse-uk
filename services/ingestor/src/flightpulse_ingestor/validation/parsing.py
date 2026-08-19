"""Defensive cell-level parsing.

CAA CSVs use thousands separators, blank cells for "not applicable", and
occasional footnote markers. These helpers never raise on malformed input —
they return None and let the caller record a rejected-row reason, per
section 47's "record rejected rows" requirement.
"""

from __future__ import annotations

import re

_NUMBER_CLEAN_RE = re.compile(r"[,\s]")
_FOOTNOTE_RE = re.compile(r"\[\d+\]$")


def parse_number(raw: str | None) -> float | None:
    if raw is None:
        return None
    text = raw.strip()
    if text in ("", "-", "..", "n/a", "N/A", ":"):
        return None
    text = _FOOTNOTE_RE.sub("", text).strip()
    text = _NUMBER_CLEAN_RE.sub("", text)
    try:
        return float(text)
    except ValueError:
        return None


def parse_percentage(raw: str | None) -> float | None:
    if raw is None:
        return None
    text = raw.strip().rstrip("%").strip()
    return parse_number(text)


def parse_int(raw: str | None) -> int | None:
    value = parse_number(raw)
    if value is None:
        return None
    return int(round(value))


def parse_caa_period(raw: str) -> tuple[int, int]:
    """Parse CAA period strings such as '202601' or 'Jan-26' into (year, month)."""
    text = raw.strip()
    if re.fullmatch(r"\d{6}", text):
        return int(text[:4]), int(text[4:6])

    months = {
        "jan": 1,
        "feb": 2,
        "mar": 3,
        "apr": 4,
        "may": 5,
        "jun": 6,
        "jul": 7,
        "aug": 8,
        "sep": 9,
        "oct": 10,
        "nov": 11,
        "dec": 12,
    }
    match = re.fullmatch(r"([A-Za-z]{3})-?(\d{2,4})", text)
    if match:
        month_key = match.group(1).lower()[:3]
        if month_key in months:
            year = int(match.group(2))
            if year < 100:
                year += 2000
            return year, months[month_key]

    raise ValueError(f"Unrecognised CAA period format: {raw!r}")
