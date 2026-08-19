export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight text-ink">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 2 L14 9 L21.5 12 L14 13.5 L13 21 L11 21 L10 13.5 L2.5 12 L10 9 Z"
          fill="currentColor"
          className="text-sky-500"
        />
      </svg>
      <span>
        FlightPulse <span className="text-sky-500">UK</span>
      </span>
    </span>
  );
}
