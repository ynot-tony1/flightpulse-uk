"""Row- and file-level validation rules (section 81) and suspicious-change
detection (section 82)."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ValidationIssue:
    row_number: int | None
    field: str
    reason: str


@dataclass
class ValidationReport:
    rows_seen: int = 0
    rows_valid: int = 0
    issues: list[ValidationIssue] = field(default_factory=list)

    def reject(self, row_number: int | None, field_name: str, reason: str) -> None:
        self.issues.append(ValidationIssue(row_number, field_name, reason))

    @property
    def rows_rejected(self) -> int:
        return len(self.issues)


def is_non_negative(value: float | None) -> bool:
    return value is None or value >= 0


def is_valid_percentage(value: float | None) -> bool:
    return value is None or (0 <= value <= 100)


def is_valid_latitude(value: float) -> bool:
    return -90 <= value <= 90


def is_valid_longitude(value: float) -> bool:
    return -180 <= value <= 180


class SuspiciousChangeError(RuntimeError):
    """Raised to abort an import rather than overwrite good data with a
    clearly broken release (section 82). Callers must surface this in the
    GitHub Actions summary and must not swallow it."""


def check_not_empty(row_count: int, *, context: str) -> None:
    if row_count == 0:
        raise SuspiciousChangeError(f"{context}: file parsed to zero rows")


def check_not_html(looks_like_html: bool, *, context: str) -> None:
    if looks_like_html:
        raise SuspiciousChangeError(f"{context}: download returned an HTML page instead of CSV")


def check_expected_headers(actual: set[str], expected: set[str], *, context: str) -> None:
    missing = expected - actual
    if missing:
        raise SuspiciousChangeError(f"{context}: expected header(s) missing: {sorted(missing)}")


def check_total_collapse(
    previous_total: float | None,
    new_total: float,
    *,
    context: str,
    max_drop_fraction: float = 0.5,
) -> None:
    """Fail if a total collapses implausibly versus the last known-good
    import for the same table/period family (e.g. >50% drop)."""
    if previous_total is None or previous_total <= 0:
        return
    drop_fraction = (previous_total - new_total) / previous_total
    if drop_fraction > max_drop_fraction:
        raise SuspiciousChangeError(
            f"{context}: total collapsed by {drop_fraction:.0%} versus previous import "
            f"(previous={previous_total}, new={new_total})"
        )
