import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  unit,
  trend,
  tone = "neutral",
}: {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          {label}
        </span>
        <span className="tabular-nums text-2xl font-semibold text-ink">
          {value}
          {unit && (
            <span className="ml-1 text-sm font-normal text-ink-muted">
              {unit}
            </span>
          )}
        </span>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              tone === "positive" && "text-emerald-500",
              tone === "negative" && "text-rose-500",
              tone === "neutral" && "text-ink-faint",
            )}
          >
            {trend}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
