import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-ink-muted sm:px-6 lg:px-8">
        <p className="max-w-2xl">
          FlightPulse UK is an independent data exploration application and is
          not affiliated with or endorsed by the UK Civil Aviation Authority.
          Aviation statistics: Source: UK Civil Aviation Authority. Airport
          geographic reference data: OurAirports (public domain).
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/about/data" className="hover:text-ink">
            Methodology &amp; data sources
          </Link>
          <Link href="/status" className="hover:text-ink">
            System status
          </Link>
          <a
            href="https://www.caa.co.uk/data-and-analysis/"
            className="hover:text-ink"
          >
            CAA data &amp; analysis ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
