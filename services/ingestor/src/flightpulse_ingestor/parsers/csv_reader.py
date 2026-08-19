"""Generic, defensive CAA CSV reading.

CAA CSV exports commonly include a title row, a blank row, and a footnote
block after the data. We locate the real header row by looking for the
first row containing at least `min_columns` non-empty cells, rather than
assuming row 0 is always the header.

Everything is read as strings — numeric/percentage coercion happens in
validation/parsing.py so that a malformed cell becomes a recorded rejection
rather than a crash.
"""

from __future__ import annotations

import csv
import io


def detect_encoding(raw: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            raw.decode(encoding)
            return encoding
        except UnicodeDecodeError:
            continue
    return "latin-1"  # latin-1 never raises; last resort


def read_rows(raw: bytes, *, min_columns: int = 2) -> tuple[list[str], list[dict[str, str]]]:
    """Returns (header, rows) where rows are dicts keyed by header name.

    Skips leading title/blank rows and trailing footnote rows that have
    fewer than `min_columns` populated cells.
    """
    encoding = detect_encoding(raw)
    text = raw.decode(encoding)
    reader = csv.reader(io.StringIO(text))
    all_rows = [row for row in reader]

    header_index = None
    for i, row in enumerate(all_rows):
        populated = sum(1 for cell in row if cell.strip())
        if populated >= min_columns:
            header_index = i
            break

    if header_index is None:
        return [], []

    header = [cell.strip() for cell in all_rows[header_index]]
    data_rows: list[dict[str, str]] = []
    for row in all_rows[header_index + 1 :]:
        populated = sum(1 for cell in row if cell.strip())
        if populated < min_columns:
            continue  # likely a footnote/blank trailer row
        padded = row + [""] * (len(header) - len(row))
        data_rows.append({h: padded[i].strip() for i, h in enumerate(header) if h})

    return header, data_rows
