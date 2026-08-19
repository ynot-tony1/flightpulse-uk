# Troubleshooting

## `discover` returns zero links

CAA occasionally renames a table or restructures an index page. Fetch the
index page URL manually (printed by the `discover` command) and check the
table's exact link text; update the `name:` value in
`config/caa-tables.yml` to match, then re-run. Table names/URLs in this
repository were last verified live on 2026-08-19.

## `check_expected_headers` / adapter rejects "no recognised column"

The adapter's column-name candidate list
(`AIRPORT_COLUMN_CANDIDATES`, `METRIC_TABLE_MAP`, etc. in the relevant
`services/ingestor/src/flightpulse_ingestor/adapters/*.py` file) didn't
match the live file. Run `ingestor inspect <family> --year --month
--table-code <code>` to see the real header and sample row, then add the
new column name to the candidate list (keep the old one too, for
historical files) and add/extend a fixture-based test.

## A large proportion of rows are "unresolved"

Expected for airline statistics (see docs/methodology.md — the CAA file
lists every operator, not just major airlines) and expected for
international route tables until `config/airport-aliases.yml` is expanded
beyond UK airports to cover common foreign destinations. This is
intentional conservatism, not a bug — never "fix" it by switching to fuzzy
name matching.

## `DatabaseNotConfiguredError`

`INGEST_DATABASE_URL` (ingestor) or `DATABASE_URL` (web app) is unset. Until
CockroachDB Cloud provisioning is complete (docs/deployment.md#deferred-database-setup),
this is expected for any command that touches the database; every
discovery/download/parse/validate command works without it.

## Vercel build fails on a Prisma-related error

`prisma generate` only needs the schema file, not a live connection —
confirm the build command actually runs `pnpm --filter @flightpulse/database generate`
(or that it's wired into a `postinstall`/`build` script) and that
`DATABASE_URL` is set to *some* syntactically valid value even before the
real database exists, since Prisma's generator validates the URL format at
generate time.

## Map is slow / renders too many routes

Check the request actually includes a route-count cap
(`config/map-config.yml` → `routes.default_count`, hard max via
`MAP_MAX_ROUTES`) — the API must never return the unfiltered full
historical route set (section 51 of the build brief).
test: verify Vercel GitHub auto-deploy
