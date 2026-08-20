# Methodology

This document is the canonical record of calculation rules. UI copy and
`config/metric-definitions.yml` should never contradict it; if a rule
changes, bump `methodology_version` rather than silently redefining a
historical figure.

## Domestic route double-counting

**Problem.** CAA's UK Airport Data publishes two tables that both describe
domestic passenger routes:

- **Table 12.2 — "Domestic Air Pax Traffic Route Analysis"**: one row per
  *unordered* airport pair (`airport_1_name`, `airport_2_name`). Confirmed
  live on 2026-08-19: the December 2025 file contains **200 rows**.
- **Table 12.3 — "Dom Air Pax Route Analysis by Each Reporting Airport"**:
  one row per airport pair *per reporting airport* — i.e. the
  Aberdeen–Belfast City flow can appear once from Aberdeen's return and once
  from Belfast City's return. Confirmed live for the same period: **363
  rows** — visibly more than 12.2, exactly as expected if a meaningful
  fraction of pairs are reported from both ends.

**Rule.** Table 12.2 is the canonical source for any UK-wide domestic route
total or any calculation that sums across multiple domestic routes. Table
12.3 is retained in the allowlist for a possible future airport-centric
"routes reported by airport X" view, but its rows are **never** summed into
a national total — doing so would double-count every pair reported from
both ends.

This is enforced in code: `AirportStatisticsAdapter` (see
`services/ingestor/src/flightpulse_ingestor/adapters/caa_airport_statistics.py`)
only parses table_12_2 into `RouteMonthlyMetric` rows; table_12_3 is
allowlisted-but-not-wired (documented in `config/caa-tables.yml`).

## Route directionality

- **Domestic routes** (Table 12.2) are stored as a single undirected pair.
  `Route.originAirportId` / `destinationAirportId` are populated in the
  order CAA lists them (`airport_1_name`, `airport_2_name`); UI code must
  not assume this order carries meaning (e.g. "origin" vs "destination" is
  not implied for domestic pairs) and should offer both airports as
  equally valid search directions.
- **International routes** (Table 12.1) *are* directional in the source —
  `UK_airport` → `foreign_airport` — and are stored with that direction
  preserved.

## Punctuality definitions

Verified live across several 2025-2026 "Punctuality Statistics Summary
Analysis" files on 2026-08-20: despite the column layout appearing to
support named-destination rows, in practice this table only ever contains
three `Origin Destination` values — `"AIRPORT TOTAL"` (the airport-level
aggregate FlightPulse UK imports), `"SCHEDULED FLIGHTS(ALL ROUTES)"` and
`"CHARTERED FLIGHTS(ALL ROUTES)"` (aggregate rows, not real destinations —
neither is imported). It has no airline column at all.

Route-level punctuality instead comes from the CAA "Full Analysis" table —
one row per reporting airport × destination × airline × scheduled/charter
service. FlightPulse UK aggregates every airline's rows for a given route
into a single flight-weighted figure (see weighted aggregation below),
currently discarding the airline dimension rather than resolving every
airline that has ever operated a UK route — a materially larger
alias-matching surface than the ~25 airlines already reviewed for
airline-statistics. International destinations in this table (routes to
anywhere outside the UK/Crown Dependencies) are excluded, not fabricated.

- **Average delay** (airport-level): CAA's own `Average Delay Minutes`
  column, used directly. Never recomputed from the delay bands.
- **Average delay** (route-level): no single CAA column exists at
  route-level, since the source is one row per airline per route. Computed
  as the flight-weighted average of each airline's own `average_delay_mins`
  for that route (see weighted aggregation below) — never a plain mean
  across airlines.
- **On-time percentage**: CAA does not publish this as a single column in
  either file. It is computed as the sum of two CAA-published band
  percentages: `Flights 15 minutes early to 1 minute early percent` +
  `Flights 0 (zero) to 15 minutes late percent` — i.e. the standard -15 to
  +15 minute window. If either band is missing for a row, `on_time_percentage`
  is left null rather than guessed.
- **Weighted aggregation**: when FlightPulse UK needs to combine multiple
  punctuality records (e.g. several routes at one airport) into a single
  average delay, it uses flight-weighted averaging:

  ```
  weighted_delay = sum(average_delay_minutes * flights_matched) / sum(flights_matched)
  ```

  A plain (unweighted) mean of per-route averages is never used, and never
  labelled as a national or airport-wide figure. Same principle for on-time
  percentage: aggregated from underlying flight counts, never averaged as
  percentages. See `packages/shared/src/analytics.ts` (`weightedAverage`,
  `aggregateOnTimePercentage`).
- **Coverage**: punctuality statistics cover only the airports/routes CAA
  actually publishes for a given period. FlightPulse UK stores this
  explicitly (`Airport.punctualityMonitored`) and the UI shows "CAA
  punctuality statistics are not available for this airport in the selected
  period" rather than inferring or interpolating a value.
- **Rankings**: never labelled "best/worst airport" — always qualified,
  e.g. "Lowest recorded average delay", because these are measures over a
  defined period and coverage set, not an absolute ranking.

## Percentage change and other derived analytics

Implemented once in `packages/shared/src/analytics.ts` and unit-tested
(`apps/web/tests/analytics.test.ts`):

- **Percentage change**: `(new - old) / old * 100`; when `old == 0`, returns
  `null` with an explicit "no prior baseline" flag rather than dividing by
  zero or showing `Infinity`.
- **Rolling 12 months**: the latest 12 *complete* monthly periods ending at
  the reference month — explicitly not calendar-year traffic, and returns
  `null` if fewer than 12 complete months exist.
- **Market/traffic share**: `part / total`, with the denominator always
  named in the UI (e.g. "share of all UK airport passengers") and guarded
  against `total <= 0`.
- **Seasonality**: monthly share of annual traffic, averaged only across
  years confirmed complete; an in-progress current year is never compared
  directly against a complete prior year without labelling the difference.

## Route distance

`distance_km` is **not** a CAA-published statistic. It is the haversine
great-circle distance between the origin and destination airport's
OurAirports coordinates (`packages/shared/src/geo.ts`), always labelled
"Approximate great-circle distance" in the UI, and never presented as actual
flown distance.

## Punctuality/airline coverage caveat

`config/airline-aliases.yml` intentionally contains only a small, manually
reviewed set of major UK airlines. A live test run of `AirlineStatisticsAdapter`
against April 2026 Table 03 (which lists every operator that filed a return
that month, including one-off charter/GA operators) resolves only a minority
of rows — this is the intended conservative behaviour (section 28 of the
build brief), not a defect. Expanding the alias list is a reviewed,
incremental process, not a bulk fuzzy-match operation.
