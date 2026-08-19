import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type BadgeTone = "neutral" | "sky" | "amber" | "emerald" | "rose";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-paper-subtle text-ink-muted border-border",
  sky: "bg-sky-50 text-sky-600 border-sky-100",
  amber: "bg-amber-100 text-amber-600 border-amber-100",
  emerald: "bg-emerald-100 text-emerald-600 border-emerald-100",
  rose: "bg-rose-100 text-rose-600 border-rose-100",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
