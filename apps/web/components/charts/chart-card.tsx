import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { SourceBadge } from "@/components/ui/source-badge";

export function ChartCard({
  title,
  description,
  period,
  children,
  className,
}: {
  title: string;
  description?: string;
  period?: { year: number; month: number };
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex flex-col gap-1 p-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <SourceBadge year={period?.year} month={period?.month} />
        </div>
        {description && <p className="text-sm text-ink-muted">{description}</p>}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </Card>
  );
}
