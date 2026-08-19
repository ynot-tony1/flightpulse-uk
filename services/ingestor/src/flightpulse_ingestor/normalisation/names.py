"""Conservative name normalisation and alias-registry matching.

Matching priority (section 11): ICAO code, then IATA code, then a reviewed
manual mapping, then normalised-name match. There is deliberately no fuzzy
matching step — anything that does not match one of these is left
unresolved rather than guessed (section 48).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import yaml


def normalise_name(raw: str) -> str:
    upper = raw.strip().upper()
    upper = re.sub(r"[.'()]", "", upper)
    upper = re.sub(r"\s+", " ", upper)
    return upper.strip()


@dataclass(frozen=True)
class AirportAliasEntry:
    caa_name: str
    canonical_code: str
    iata: str | None
    icao: str | None
    match_method: str
    reviewed: bool


class AirportAliasRegistry:
    def __init__(self, entries: list[AirportAliasEntry], unresolved: set[str]):
        self._by_normalised_name = {normalise_name(e.caa_name): e for e in entries}
        self._unresolved = unresolved

    @classmethod
    def load(cls, path: Path) -> AirportAliasRegistry:
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        entries = [
            AirportAliasEntry(
                caa_name=item["caa_name"],
                canonical_code=item["canonical_code"],
                iata=item.get("iata"),
                icao=item.get("icao"),
                match_method=item.get("match_method", "normalised_name"),
                reviewed=bool(item.get("reviewed", False)),
            )
            for item in raw.get("aliases", [])
        ]
        unresolved = {normalise_name(item["caa_name"]) for item in raw.get("unresolved", [])}
        return cls(entries, unresolved)

    def resolve(self, caa_name: str) -> AirportAliasEntry | None:
        key = normalise_name(caa_name)
        if key in self._unresolved:
            return None
        return self._by_normalised_name.get(key)

    def reviewed_entries(self) -> list[AirportAliasEntry]:
        return [e for e in self._by_normalised_name.values() if e.reviewed]

    def is_known_unresolved(self, caa_name: str) -> bool:
        return normalise_name(caa_name) in self._unresolved


@dataclass(frozen=True)
class AirlineAliasEntry:
    caa_name: str
    canonical_name: str
    iata: str | None
    icao: str | None
    reviewed: bool


class AirlineAliasRegistry:
    def __init__(self, entries: list[AirlineAliasEntry]):
        self._by_normalised_name = {normalise_name(e.caa_name): e for e in entries}

    @classmethod
    def load(cls, path: Path) -> AirlineAliasRegistry:
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        entries = [
            AirlineAliasEntry(
                caa_name=item["caa_name"],
                canonical_name=item["canonical_name"],
                iata=item.get("iata"),
                icao=item.get("icao"),
                reviewed=bool(item.get("reviewed", False)),
            )
            for item in raw.get("aliases", [])
        ]
        return cls(entries)

    def resolve(self, caa_name: str) -> AirlineAliasEntry | None:
        return self._by_normalised_name.get(normalise_name(caa_name))
