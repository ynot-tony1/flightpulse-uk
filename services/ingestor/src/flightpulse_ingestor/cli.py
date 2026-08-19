"""FlightPulse UK ingestor CLI.

Commands are intentionally thin wrappers around the adapters/ modules so
that the same logic is exercised whether invoked from a terminal, a Docker
container, or a GitHub Actions workflow_dispatch step.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import typer

from flightpulse_ingestor.adapters.base import AdapterRunResult
from flightpulse_ingestor.config import IngestorSettings, load_settings
from flightpulse_ingestor.database.connection import DatabaseNotConfiguredError, connect
from flightpulse_ingestor.discovery import (
    MONTH_NAMES,
    discover_table_links,
    month_page_url,
    punctuality_year_url,
)
from flightpulse_ingestor.http_client import build_client
from flightpulse_ingestor.logging_setup import configure_logging, get_logger
from flightpulse_ingestor.normalisation.names import AirlineAliasRegistry, AirportAliasRegistry

app = typer.Typer(add_completion=False, help="FlightPulse UK CAA ingestion CLI")


def _resolve_config_dir() -> Path:
    """Find config/caa-tables.yml either via FLIGHTPULSE_CONFIG_DIR (set in
    the Docker image / GitHub Actions), or by walking up from this file
    (local monorepo development)."""
    override = os.environ.get("FLIGHTPULSE_CONFIG_DIR")
    if override:
        return Path(override)

    for parent in Path(__file__).resolve().parents:
        candidate = parent / "config"
        if (candidate / "caa-tables.yml").is_file():
            return candidate

    raise RuntimeError("Could not locate config/caa-tables.yml — set FLIGHTPULSE_CONFIG_DIR explicitly.")


CONFIG_DIR = _resolve_config_dir()

log = get_logger(__name__)


def _init() -> None:
    settings = load_settings()
    configure_logging(settings.log_level)


@app.command()
def sources() -> None:
    """List configured source datasets from config/source-registry.yml."""
    _init()
    import yaml

    raw = yaml.safe_load((CONFIG_DIR / "source-registry.yml").read_text(encoding="utf-8"))
    for source in raw["sources"]:
        typer.echo(f"{source['dataset_code']:28s} {source['dataset_name']} ({source['data_family']})")
        typer.echo(f"{'':28s} {source['official_url']}")


@app.command()
def discover(
    family: str = typer.Argument(..., help="airports | airlines | punctuality"),
    year: int = typer.Option(..., help="e.g. 2026"),
    month: int = typer.Option(..., help="1-12"),
) -> None:
    """Discover CSV download links for a given family/period without downloading."""
    _init()
    import yaml

    tables = yaml.safe_load((CONFIG_DIR / "caa-tables.yml").read_text(encoding="utf-8"))

    with build_client(load_settings()) as client:
        if family == "airports":
            allowlist = {code: meta["name"] for code, meta in tables["airport_statistics"]["tables"].items()}
            index_url = month_page_url("airports", year, MONTH_NAMES[month - 1])
        elif family == "airlines":
            allowlist = {code: meta["name"] for code, meta in tables["airline_statistics"]["tables"].items()}
            index_url = month_page_url("airlines", year, MONTH_NAMES[month - 1])
        elif family == "punctuality":
            allowlist = {code: meta["name"] for code, meta in tables["punctuality"]["tables"].items()}
            index_url = punctuality_year_url(year)
        else:
            typer.echo(f"Unknown family: {family}", err=True)
            raise typer.Exit(1)

        typer.echo(f"Index page: {index_url}")
        links = discover_table_links(client, index_url, allowlist)
        if not links:
            typer.echo("No matching CSV links found on this page.")
            raise typer.Exit(1)
        for link in links:
            typer.echo(f"  [{link.table_code}] {link.table_name} -> {link.url}")


@app.command()
def inspect(
    family: str = typer.Argument(...),
    year: int = typer.Option(...),
    month: int = typer.Option(...),
    table_code: str = typer.Option(..., help="Table code from `discover`"),
) -> None:
    """Download one table and print its detected header + row count, without importing."""
    _init()
    import yaml

    from flightpulse_ingestor.http_client import download_file
    from flightpulse_ingestor.parsers.csv_reader import read_rows

    tables = yaml.safe_load((CONFIG_DIR / "caa-tables.yml").read_text(encoding="utf-8"))

    with build_client(load_settings()) as client:
        if family == "airports":
            allowlist = {code: meta["name"] for code, meta in tables["airport_statistics"]["tables"].items()}
            index_url = month_page_url("airports", year, MONTH_NAMES[month - 1])
        elif family == "punctuality":
            allowlist = {code: meta["name"] for code, meta in tables["punctuality"]["tables"].items()}
            index_url = punctuality_year_url(year)
        elif family == "airlines":
            allowlist = {code: meta["name"] for code, meta in tables["airline_statistics"]["tables"].items()}
            index_url = month_page_url("airlines", year, MONTH_NAMES[month - 1])
        else:
            typer.echo(f"Unknown family: {family}", err=True)
            raise typer.Exit(1)

        links = discover_table_links(client, index_url, allowlist)
        match = next((link for link in links if link.table_code == table_code), None)
        if match is None:
            typer.echo(f"table_code {table_code!r} not found on {index_url}", err=True)
            raise typer.Exit(1)

        downloaded = download_file(client, match.url)
        header, rows = read_rows(downloaded.content)
        typer.echo(
            json.dumps(
                {
                    "url": match.url,
                    "checksum_sha256": downloaded.checksum_sha256,
                    "size_bytes": downloaded.size_bytes,
                    "looks_like_html": downloaded.looks_like_html,
                    "header": header,
                    "row_count": len(rows),
                    "sample_row": rows[0] if rows else None,
                },
                indent=2,
            )
        )


@app.command("import-airport-statistics")
def import_airport_statistics(
    year: int = typer.Option(...),
    month: int = typer.Option(...),
    dry_run: bool = typer.Option(False),
) -> None:
    """Run CAAAirportStatisticsAdapter for one period."""
    _init()
    from flightpulse_ingestor.adapters.caa_airport_statistics import AirportStatisticsAdapter

    settings = load_settings()
    if not settings.airport_stats_enabled:
        typer.echo("AIRPORT_STATS_ENABLED is false — skipping.")
        raise typer.Exit(0)

    alias_registry = AirportAliasRegistry.load(CONFIG_DIR / "airport-aliases.yml")
    with build_client(settings) as client:
        adapter = AirportStatisticsAdapter(client=client, config_dir=CONFIG_DIR, alias_registry=alias_registry)
        result = adapter.run(year, month, dry_run=dry_run)

    _report_run(result)
    if not dry_run:
        _persist_or_warn(result, settings)


@app.command("import-punctuality")
def import_punctuality(
    year: int = typer.Option(...),
    month: int = typer.Option(...),
    dry_run: bool = typer.Option(False),
) -> None:
    """Run CAAPunctualityAdapter for one period."""
    _init()
    from flightpulse_ingestor.adapters.caa_punctuality import PunctualityAdapter

    settings = load_settings()
    if not settings.punctuality_stats_enabled:
        typer.echo("PUNCTUALITY_STATS_ENABLED is false — skipping.")
        raise typer.Exit(0)

    airport_registry = AirportAliasRegistry.load(CONFIG_DIR / "airport-aliases.yml")
    airline_registry = AirlineAliasRegistry.load(CONFIG_DIR / "airline-aliases.yml")
    with build_client(settings) as client:
        adapter = PunctualityAdapter(
            client=client, config_dir=CONFIG_DIR, airport_registry=airport_registry, airline_registry=airline_registry
        )
        result = adapter.run(year, month, dry_run=dry_run)

    _report_run(result)
    if not dry_run:
        _persist_or_warn(result, settings)


@app.command("import-airlines")
def import_airlines(
    year: int = typer.Option(...),
    month: int = typer.Option(...),
    dry_run: bool = typer.Option(False),
) -> None:
    """Run CAAAirlineStatisticsAdapter for one period."""
    _init()
    from flightpulse_ingestor.adapters.caa_airline_statistics import AirlineStatisticsAdapter

    settings = load_settings()
    if not settings.airline_stats_enabled:
        typer.echo("AIRLINE_STATS_ENABLED is false — skipping.")
        raise typer.Exit(0)

    airline_registry = AirlineAliasRegistry.load(CONFIG_DIR / "airline-aliases.yml")
    with build_client(settings) as client:
        adapter = AirlineStatisticsAdapter(client=client, config_dir=CONFIG_DIR, airline_registry=airline_registry)
        result = adapter.run(year, month, dry_run=dry_run)

    _report_run(result)
    if not dry_run:
        _persist_or_warn(result, settings)


@app.command("refresh-airport-reference")
def refresh_airport_reference(dry_run: bool = typer.Option(False)) -> None:
    """Run AirportReferenceAdapter (OurAirports geographic snapshot)."""
    _init()
    from flightpulse_ingestor.adapters.airport_reference import AirportReferenceAdapter

    settings = load_settings()
    with build_client(settings) as client:
        adapter = AirportReferenceAdapter(client=client)
        records = adapter.fetch_uk_airports()

    typer.echo(f"Fetched {len(records)} UK airport reference records from OurAirports.")
    if dry_run:
        for r in records[:5]:
            coords = f"({r.latitude:.4f}, {r.longitude:.4f})"
            typer.echo(f"  {r.icao_code or '----'} {r.iata_code or '---'} {r.name} {coords}")
        return

    from flightpulse_ingestor.commands import persist

    alias_registry = AirportAliasRegistry.load(CONFIG_DIR / "airport-aliases.yml")
    try:
        with connect(settings) as conn:
            summary = persist.persist_airport_reference(conn, reference_records=records, alias_registry=alias_registry)
        typer.echo(
            json.dumps(
                {"airports_upserted": summary.rows_inserted, "no_ourairports_match": summary.rows_skipped},
                indent=2,
            )
        )
    except DatabaseNotConfiguredError as exc:
        typer.echo(str(exc))


@app.command("import-airports")
def import_airports() -> None:
    """Alias for refresh-airport-reference (matches section 44 command list)."""
    refresh_airport_reference(dry_run=False)


@app.command("refresh-metrics")
def refresh_metrics() -> None:
    """Recompute AggregateMetric rows used by dashboard/rankings."""
    _init()
    settings = load_settings()
    try:
        with connect(settings):
            typer.echo("Aggregate metric refresh requires production SQL not yet finalised in this build phase.")
    except DatabaseNotConfiguredError as exc:
        typer.echo(str(exc))
        raise typer.Exit(0) from exc


@app.command()
def verify() -> None:
    """Verify database connectivity (SELECT 1) without printing the connection string."""
    _init()
    settings = load_settings()
    try:
        with connect(settings) as conn, conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        typer.echo("Database connection verified (SELECT 1 succeeded).")
    except DatabaseNotConfiguredError as exc:
        typer.echo(str(exc))
        raise typer.Exit(0) from exc


@app.command()
def cleanup() -> None:
    """Remove any temporary downloaded files (section 80 — never persist raw CSVs)."""
    _init()
    settings = load_settings()
    data_dir = Path(settings.data_dir)
    if data_dir.exists():
        import shutil

        shutil.rmtree(data_dir)
        typer.echo(f"Removed {data_dir}")
    else:
        typer.echo("Nothing to clean up.")


@app.command()
def run(
    year: int = typer.Option(...),
    month: int = typer.Option(...),
    dry_run: bool = typer.Option(False),
) -> None:
    """Run all enabled adapters for one period, then clean up."""
    _init()
    settings = load_settings()
    if not settings.ingestion_enabled:
        typer.echo("INGESTION_ENABLED is false — nothing to do.")
        raise typer.Exit(0)

    if settings.airport_stats_enabled:
        import_airport_statistics(year=year, month=month, dry_run=dry_run)
    if settings.punctuality_stats_enabled:
        import_punctuality(year=year, month=month, dry_run=dry_run)
    if settings.airline_stats_enabled:
        import_airlines(year=year, month=month, dry_run=dry_run)
    cleanup()


def _report_run(result: AdapterRunResult) -> None:
    typer.echo(
        json.dumps(
            {
                "dataset_code": result.dataset_code,
                "period": list(result.period),
                "links_discovered": len(result.discovered_links),
                "files_downloaded": len(result.downloads),
                "rows_seen": result.validation.rows_seen,
                "rows_valid": result.validation.rows_valid,
                "rows_rejected": result.validation.rows_rejected,
                "unresolved_names": sorted(result.unresolved_names),
                "records_parsed": len(result.records),
            },
            indent=2,
        )
    )


def _persist_or_warn(result: AdapterRunResult, settings: IngestorSettings) -> None:
    from flightpulse_ingestor.commands import persist

    try:
        with connect(settings) as conn:
            if result.dataset_code == "caa_airport_statistics":
                summary = persist.persist_airport_statistics(conn, CONFIG_DIR, result)
            elif result.dataset_code == "caa_punctuality_statistics":
                summary = persist.persist_punctuality(conn, CONFIG_DIR, result)
            elif result.dataset_code == "caa_airline_statistics":
                summary = persist.persist_airlines(conn, CONFIG_DIR, result)
            else:
                typer.echo(f"No persist handler for dataset {result.dataset_code!r}")
                return
        typer.echo(
            json.dumps(
                {
                    "persisted": {
                        "inserted": summary.rows_inserted,
                        "updated": summary.rows_updated,
                        "skipped_unresolved_airport": summary.rows_skipped,
                    }
                },
                indent=2,
            )
        )
    except DatabaseNotConfiguredError as exc:
        typer.echo(str(exc))


if __name__ == "__main__":
    app()
