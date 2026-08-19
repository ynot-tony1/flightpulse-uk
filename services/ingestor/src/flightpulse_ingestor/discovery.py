"""CAA publication-page discovery.

CAA statistics pages list one download link per table, as plain anchor tags
pointing at `/Documents/Download/...` document IDs — there is no public API,
so discovery means parsing that index HTML and matching link text against an
explicit allowlist of table names (config/caa-tables.yml). We deliberately do
not guess or hardcode document IDs: they are re-discovered on every run so
that revised files (a new document ID replacing an old one for the same
table) are detected automatically.
"""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urljoin

import httpx
from selectolax.parser import HTMLParser

from flightpulse_ingestor.http_client import fetch_text

CAA_BASE_URL = "https://www.caa.co.uk"


@dataclass(frozen=True)
class DiscoveredLink:
    table_code: str
    table_name: str
    label_text: str
    url: str
    file_format: str  # csv | xlsx | pdf


def discover_table_links(
    client: httpx.Client,
    index_url: str,
    table_allowlist: dict[str, str],
) -> list[DiscoveredLink]:
    """Fetch an index page and return links matching the allowlisted table
    names. `table_allowlist` maps table_code -> exact/near-exact table name
    as it appears in the CAA page link text (see config/caa-tables.yml)."""

    html = fetch_text(client, index_url)
    tree = HTMLParser(html)

    found: list[DiscoveredLink] = []
    for anchor in tree.css("a[href]"):
        href = anchor.attributes.get("href") or ""
        if "/documents/download/" not in href.lower():
            continue

        label = (anchor.text() or "").strip()
        if not label:
            continue

        file_format = _guess_format(label)
        matched = _match_table(label, table_allowlist)
        if matched is None:
            continue

        table_code, table_name = matched
        found.append(
            DiscoveredLink(
                table_code=table_code,
                table_name=table_name,
                label_text=label,
                url=urljoin(CAA_BASE_URL, href),
                file_format=file_format,
            )
        )

    return found


def _guess_format(label: str) -> str:
    lower = label.lower()
    if "csv" in lower:
        return "csv"
    if "xlsx" in lower or "excel" in lower:
        return "xlsx"
    if "pdf" in lower:
        return "pdf"
    return "unknown"


def _match_table(label: str, table_allowlist: dict[str, str]) -> tuple[str, str] | None:
    lower = label.lower()
    if "csv" not in lower:
        # Section 4: prefer CSV over HTML/PDF whenever a CSV exists.
        return None

    for table_code, table_name in table_allowlist.items():
        if table_name.lower() in lower:
            return table_code, table_name
    return None


def month_page_url(family: str, year: int, month_name: str) -> str:
    """Build a CAA year/month index page URL for a given data family.

    family: "airports" | "airlines"
    """
    if family == "airports":
        path = f"uk-aviation-market/airports/uk-airport-data/uk-airport-data-{year}/{month_name}-{year}/"
        return f"{CAA_BASE_URL}/data-and-analysis/{path}"
    if family == "airlines":
        path = f"uk-aviation-market/airlines/uk-airline-data/uk-airline-data-{year}/{month_name}-{year}/"
        return f"{CAA_BASE_URL}/data-and-analysis/{path}"
    raise ValueError(f"Unknown data family for month_page_url: {family}")


def punctuality_year_url(year: int) -> str:
    path = f"uk-aviation-market/flight-punctuality/uk-flight-punctuality-statistics/{year}/"
    return f"{CAA_BASE_URL}/data-and-analysis/{path}"


MONTH_NAMES = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
]
