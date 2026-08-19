# Operations runbook

## Secret handling

- Never commit a connection string, API token, or GitHub/Vercel secret to
  the repository. `.env` is gitignored; only `.env.example` (placeholder
  values) is committed.
- `services/ingestor/src/flightpulse_ingestor/config.py` and
  `database/connection.py` read `INGEST_DATABASE_URL` from the environment
  and never log, print, or include it in an error message.
- `logging_setup.py` sends all structured logs to **stderr**, keeping
  stdout clean for CLI JSON output — this also means log lines never end up
  mixed into a piped/redirected result that might later be pasted
  somewhere.

## Ingestion on/off switches

- Repository variable `INGESTION_ENABLED=false` disables every scheduled
  ingestion workflow immediately (checked at the start of `ingestor run`
  and each `import-*` command) without editing workflow YAML.
- Per-family switches: `AIRPORT_STATS_ENABLED`, `PUNCTUALITY_STATS_ENABLED`,
  `AIRLINE_STATS_ENABLED`.

## Common tasks

| Task | Command |
|---|---|
| Check for a new CAA release | `ingestor discover airports --year YYYY --month M` (repeat per family) |
| Import one month | `ingestor import-airport-statistics --year YYYY --month M` |
| Sample/dry-run a month | add `--dry-run` to any `import-*` command |
| Inspect a table's real headers | `ingestor inspect airports --year YYYY --month M --table-code table_09` |
| Force a revised-file reimport | re-run the same `import-*` command — checksum comparison handles it automatically |
| Add an airport alias | edit `config/airport-aliases.yml`, get it reviewed in PR, set `reviewed: true` |
| Add an airline alias | edit `config/airline-aliases.yml`, same review process |
| Apply production migrations | run the `migrate-production.yml` workflow manually (never automatic) |
| Redeploy Vercel | push to `main`, or `vercel deploy --prod` from a linked checkout |
| Roll back Vercel | `vercel rollback` (promotes a previous deployment) |
| Rotate database credentials | provision new CockroachDB role passwords, update the three GitHub/Vercel secrets, then revoke the old passwords |
| Check CockroachDB storage/RU use | CockroachDB Cloud console → cluster `woeful-climber` → Metrics (see section 79 of the build brief for the calibration targets) |
| Verify production health | open `/status`, confirm DB/ingestion freshness fields are populated |

## Failed-import triage

1. Check the GitHub Actions run summary — `SuspiciousChangeError` messages
   name exactly which check failed (zero rows, HTML instead of CSV, missing
   header, total collapse).
2. Re-run the same period with `--dry-run` locally to reproduce without
   touching the database.
3. If the cause is a genuine CAA table/column change, update
   `config/caa-tables.yml` and the relevant adapter's column-name
   candidates, add a fixture reproducing the new shape, and open a PR — see
   docs/troubleshooting.md.
