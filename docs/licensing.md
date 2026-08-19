# Licensing, attribution and redistribution

## CAA data

- Terms of use: https://www.caa.co.uk/our-work/publications/terms-of-use/
- Required attribution (shown wherever CAA-sourced figures appear in the
  UI): **"Source: UK Civil Aviation Authority"**, plus the specific
  publication period and a link back to the relevant CAA page.
- FlightPulse UK does **not**:
  - sell raw CAA statistics,
  - offer bulk/paid CAA data downloads,
  - mirror complete CAA datasets (only the allowlisted tables/columns in
    `config/caa-tables.yml` are imported, and only normalised facts —
    never the raw CSV files — are stored; see section "No raw file
    storage" below),
  - imply CAA endorsement of the product.
- A bounded CSV export of FlightPulse UK's *own computed/aggregated* views
  is a candidate future feature but is **disabled** (see
  `config/source-registry.yml` → `redistribution_policy`) until CAA's terms
  are specifically re-reviewed for that use case.
- Users who want the original data are directed to the official CAA pages
  linked from every chart's source badge, not offered a FlightPulse UK
  mirror.

## OurAirports data

- Public domain. Attribution shown as "Airport geographic reference data:
  OurAirports". Used only for coordinates/codes/type, never presented as an
  aviation *statistic*.

## No raw file storage

Downloaded CSV files exist only for the duration of a GitHub Actions
ingestion run (`services/ingestor/.data/`, deleted by the `cleanup` CLI
command at the end of every run — see `docker-compose.yml` volumes and
`.gitignore`). CockroachDB stores normalised records, source metadata
(URL, publication date, SHA-256 checksum) and computed metrics — never a
blob of the original file. See docs/architecture.md and section 80 of the
build brief this repository implements.

## Independence disclaimer

Displayed on `/about/data`:

> FlightPulse UK is an independent data exploration application and is not
> affiliated with or endorsed by the UK Civil Aviation Authority.
