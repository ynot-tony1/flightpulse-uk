import { formatMonthYear } from "@flightpulse/shared";
import { Badge } from "./badge";

export function SourceBadge({
  datasetName = "UK Civil Aviation Authority",
  year,
  month,
  officialUrl,
}: {
  datasetName?: string;
  year?: number;
  month?: number;
  officialUrl?: string;
}) {
  const period = year && month ? formatMonthYear(year, month) : null;
  const content = (
    <Badge tone="neutral" className="font-normal">
      Source: {datasetName}
      {period ? ` · ${period}` : ""}
    </Badge>
  );

  if (!officialUrl) return content;

  return (
    <a
      href={officialUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-block hover:opacity-80"
    >
      {content}
    </a>
  );
}
