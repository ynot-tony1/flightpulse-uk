import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Methodology & data sources" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-border py-8">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-3 max-w-3xl space-y-3 text-ink-muted">{children}</div>
    </section>
  );
}

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">
        Methodology &amp; data sources
      </h1>
      <p className="mt-3 max-w-2xl text-ink-muted">
        FlightPulse UK is an independent data exploration application and is not
        affiliated with or endorsed by the UK Civil Aviation Authority.
      </p>

      <Section title="CAA airport statistics">
        <p>
          Sourced from the CAA&apos;s monthly UK Airport Data CSV publications
          (Tables 01, 03, 09, 10.1, 10.2, 12.1, 12.2 and 13 — see{" "}
          <code>config/caa-tables.yml</code>). Covers terminal/transit
          passengers, aircraft movements, international and domestic passenger
          traffic, route-level passenger traffic, and freight.
        </p>
      </Section>

      <Section title="Domestic route double-counting">
        <p>
          CAA publishes two domestic-route tables: an airport-pair table
          (canonical, one row per route) and an airport-centric table (one row
          per route per reporting airport). FlightPulse UK uses only the
          canonical airport-pair table for any national domestic total, to avoid
          counting the same domestic flow twice. Full detail in{" "}
          <code>docs/methodology.md</code>.
        </p>
      </Section>

      <Section title="CAA punctuality statistics">
        <p>
          Average delay is CAA&apos;s own published figure, used directly.
          On-time percentage is computed from CAA&apos;s delay-band percentages
          using the standard ±15 minute window. Punctuality statistics cover
          only the airports and routes CAA actually monitors — coverage is never
          inferred or extrapolated to unmonitored airports.
        </p>
      </Section>

      <Section title="Weighted aggregation">
        <p>
          When combining multiple punctuality records into one figure,
          FlightPulse UK uses flight-weighted averaging (Σ(delay × flights) /
          Σ(flights)), never a plain average of pre-aggregated percentages.
        </p>
      </Section>

      <Section title="CAA airline statistics">
        <p>
          Sourced from CAA&apos;s monthly UK Airline Data CSVs (all services,
          scheduled/non-scheduled splits, and aircraft utilisation). Airline
          names are matched to a canonical identity only via a manually reviewed
          alias list — never fuzzy-matched.
        </p>
      </Section>

      <Section title="Airport geographic reference">
        <p>
          Latitude, longitude, ICAO/IATA codes, municipality and airport type
          come from OurAirports (public domain), used exclusively for map
          geometry — never to override or supplement an official CAA statistic.
        </p>
      </Section>

      <Section title="Approximate route distance">
        <p>
          Route distances shown on the map and route pages are haversine
          great-circle distances calculated from airport coordinates — not a
          CAA-published statistic, and not the actual flown distance.
        </p>
      </Section>

      <Section title="Known limitations">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Punctuality coverage is partial, not every UK airport is monitored.
          </li>
          <li>
            Airline and destination-airport name matching is conservative —
            unresolved names are excluded rather than guessed.
          </li>
          <li>
            Historical depth is intentionally limited at launch (five years of
            monthly airport/punctuality data, three years of airline data) — see
            the build roadmap.
          </li>
        </ul>
      </Section>
    </div>
  );
}
