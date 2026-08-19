# Deployment

## Components and where they run

| Component | Runs on | Trigger |
|---|---|---|
| Web app | Vercel | Git push (preview on PR, production on `main`) |
| Ingestion | GitHub Actions (Docker) | Schedule + `workflow_dispatch` |
| Migrations | GitHub Actions (`migrate-production.yml`) | Manual `workflow_dispatch` only |
| Database | CockroachDB Cloud (`safe-hippo` cluster) | Always-on managed service |

Nothing requires a developer's machine to stay on after the initial setup
described here.

```mermaid
flowchart LR
    GH["GitHub repository\n(main branch)"] -->|push| VERCEL["Vercel\n(build + deploy apps/web)"]
    GH -->|schedule / dispatch| GHA["GitHub Actions runner"]
    GHA -->|docker run| ING["Ingestion container"]
    ING -->|INGEST_DATABASE_URL| DB[("CockroachDB Cloud")]
    VERCEL -->|DATABASE_URL, read-only| DB
```

## Deferred database setup

**As of this build, CockroachDB Cloud provisioning has intentionally not
been performed.** Per the project owner's instruction, everything else was
built first; the database step happens when they return with the cluster's
admin bootstrap connection string. This section is the exact runbook for
that step — follow it in order.

1. Confirm `COCKROACH_BOOTSTRAP_URL` is present in the shell environment
   (`test -n "$COCKROACH_BOOTSTRAP_URL"`) without printing it.
2. Connect and verify: `psql "$COCKROACH_BOOTSTRAP_URL" -c "SELECT 1;"` (or
   `ingestor verify` once `INGEST_DATABASE_URL` is set to the same value
   temporarily) — confirms TLS and cluster reachability without ever
   echoing the URL.
3. Create the database: `CREATE DATABASE IF NOT EXISTS flight_intelligence;`
4. Create three roles with least privilege (see docs/database.md and
   section 66 of the build brief for the exact grants):
   `flight_migrator` (schema changes only), `flight_ingestor` (DML on
   aviation + ingestion tables), `flight_app` (read-only).
5. Generate strong passwords for each role with a password generator —
   never typed or echoed in a terminal that gets logged.
6. Build three connection strings — `MIGRATION_DATABASE_URL`,
   `INGEST_DATABASE_URL`, `DATABASE_URL` (the app's *read-only* URL, despite
   the generic name) — and store each directly in its target secret store:
   - `MIGRATION_DATABASE_URL` and `INGEST_DATABASE_URL` →
     `gh secret set MIGRATION_DATABASE_URL` / `gh secret set INGEST_DATABASE_URL`
     (paste at the interactive prompt, not as a CLI argument).
   - `DATABASE_URL` → `vercel env add DATABASE_URL production` (and
     `preview` if preview deployments should also read live data).
7. From a machine with `MIGRATION_DATABASE_URL` set:
   `pnpm --filter @flightpulse/database migrate:deploy` (wraps
   `prisma migrate deploy` — never `migrate reset` against production, see
   section 78 of the build brief).
8. Run `ingestor verify` (uses `INGEST_DATABASE_URL`) and a Vercel-side
   smoke test (any page that reads from the database) to confirm all three
   roles actually work.
9. `unset COCKROACH_BOOTSTRAP_URL` in the shell once step 6 is done.
10. Run the calibration import (docs/ingestion.md "Next steps",
    section 79 of the build brief) before backfilling years of history.

## Vercel

- Project name: `flightpulse-uk`, root directory `apps/web` (set via
  `vercel project update flightpulse-uk --root-directory apps/web`).
- Non-sensitive env vars (`NEXT_PUBLIC_*`, `MAP_MAX_ROUTES`,
  `API_CACHE_TTL_SECONDS`, `LOG_LEVEL`) are set across production, preview
  and development; see `.env.example`. `DATABASE_URL` is deferred — see
  above — and will be added as a sensitive/encrypted Vercel env var, never
  prefixed `NEXT_PUBLIC_`.
- Both a preview and a production deployment were built and verified live
  via the Vercel CLI (`vercel deploy` / `vercel deploy --prod`) — every
  top-level route returns HTTP 200. Production: https://flightpulse-uk.vercel.app

### Outstanding manual step: GitHub auto-deploy

`vercel git connect` could not complete non-interactively — connecting a
Vercel project to a GitHub repository requires the Vercel GitHub App to be
installed/authorized for the account via the browser, which a CLI session
cannot do. Until that one-time step is done, `main`/PR pushes will **not**
automatically trigger a new Vercel deployment; use `vercel deploy` /
`vercel deploy --prod` from the repository root (with `.vercel/project.json`
linked) to deploy manually. To enable automatic deploys:

1. Open the project in the Vercel dashboard → Settings → Git.
2. Click "Connect Git Repository", authorize the Vercel GitHub App for
   `ynot-tony1/flightpulse-uk` if prompted.
3. From then on, PRs get preview deployments and pushes to `main` deploy to
   production automatically, per section 69 of the build brief.

## GitHub Actions

See `.github/workflows/`. `ci.yml` runs on every PR/push (lint, typecheck,
test, build — web and ingestor, plus a Docker build smoke test). The
ingestion workflows (`ingest-*.yml`, `check-caa-releases.yml`,
`refresh-airport-reference.yml`) are schedule + `workflow_dispatch` and gate
on the `INGESTION_ENABLED` repository variable so ingestion can be paused
without editing workflow files. `migrate-production.yml` is
`workflow_dispatch`-only, never scheduled.

See docs/operations.md for the day-to-day commands (redeploy, rollback,
disable ingestion, rotate credentials).
