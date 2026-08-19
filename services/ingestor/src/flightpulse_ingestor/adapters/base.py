"""Shared adapter contract.

Each CAA data family gets its own adapter module rather than one shared
parser (section 5) — the tables genuinely have different shapes and
different validation rules, and forcing them through one code path is what
makes ingestors fragile.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from flightpulse_ingestor.discovery import DiscoveredLink
from flightpulse_ingestor.http_client import DownloadedFile
from flightpulse_ingestor.validation.rules import ValidationReport


@dataclass
class ParsedRecord:
    """A single normalised fact ready for upsert, tagged with its source."""

    kind: str  # e.g. "airport_monthly_metric", "route_monthly_metric"
    payload: dict[str, object]
    source_row_number: int | None = None


@dataclass
class AdapterRunResult:
    dataset_code: str
    period: tuple[int, int]
    discovered_links: list[DiscoveredLink] = field(default_factory=list)
    downloads: list[DownloadedFile] = field(default_factory=list)
    validation: ValidationReport = field(default_factory=ValidationReport)
    records: list[ParsedRecord] = field(default_factory=list)
    unresolved_names: set[str] = field(default_factory=set)


class SourceAdapter(Protocol):
    dataset_code: str

    def discover(self, year: int, month: int) -> list[DiscoveredLink]: ...

    def run(self, year: int, month: int, *, dry_run: bool = False) -> AdapterRunResult: ...
