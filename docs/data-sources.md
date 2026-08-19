# Data sources

FlightPulse UK uses exactly two upstream sources. Both are recorded in
`config/source-registry.yml`, which mirrors the `SourceDataset` table.

## 1. UK Civil Aviation Authority (authoritative statistics)

| Family | Official index | Update cadence |
|---|---|---|
| Airport statistics | https://www.caa.co.uk/data-and-analysis/uk-aviation-market/airports/uk-airport-data/ | Monthly, ~16th |
| Punctuality statistics | https://www.caa.co.uk/data-and-analysis/uk-aviation-market/flight-punctuality/uk-flight-punctuality-statistics/ | Monthly, ~16th |
| Airline statistics | https://www.caa.co.uk/data-and-analysis/uk-aviation-market/airlines/uk-airline-data/ | Monthly, ~23rd |

Publication cadence confirmed against
https://www.caa.co.uk/data-and-analysis/uk-aviation-market/data-publication-dates/
on 2026-08-19.

CAA's own disclaimer, which FlightPulse UK passes through rather than
silently dropping: *"The information contained in these reports have been
compiled from various sources of data. CAA validates this data however, no
warranty is given as to its accuracy, integrity or reliability."*

### Discovery, not scraping tables

FlightPulse UK does not scrape CAA's HTML tables. It parses the *index
pages* (plain server-rendered HTML, no JavaScript required) to find the CSV
download links for an explicit allowlist of tables
(`config/caa-tables.yml`), then downloads those CSVs directly. This was
verified live on 2026-08-19 — see `services/ingestor` discovery output in
docs/ingestion.md.

### Allowlisted tables

See `config/caa-tables.yml` for the full, current list with real
machine column names (confirmed by downloading live December 2025 / April
2026 files) and the explicit reasons any published table is *not* imported.
Summary:

- **Airport statistics**: Table 01 (size ranking), Table 03 (aircraft
  movements), Table 09 (terminal/transit passengers), Table 10.1
  (international passengers), Table 10.2 (domestic passengers), Table 12.1
  (international route pairs), Table 12.2 (canonical domestic route pairs),
  Table 13 (freight).
- **Punctuality**: Summary Analysis (wired into the ingestor); Full Analysis
  and Full Analysis Arrival/Departure are allowlisted for a future
  airline/direction-level breakdown but not yet parsed.
- **Airline statistics**: Table 03 (all services), Table 04/05 all-scheduled
  and all-non-scheduled, Table 08.1 (aircraft utilisation).

## 2. OurAirports (geographic reference only)

- Source: https://ourairports.com/data/ (mirrored CSV used:
  https://davidmegginson.github.io/ourairports-data/airports.csv)
- Licence: public domain
- Used **exclusively** for latitude/longitude, ICAO/IATA codes,
  municipality, country and airport type — the geometry the interactive map
  needs. It never overrides or supplements a CAA-published statistic.

## What FlightPulse UK does not use

Per the product brief, there is no commercial flight-tracking API
(FlightAware, FlightRadar24, Aviationstack, FlightAPI, RapidAPI, etc.) and no
claim of live aircraft tracking anywhere in the product. FlightPulse UK is a
published-statistics and punctuality-intelligence platform.

See docs/licensing.md for attribution and redistribution rules.
