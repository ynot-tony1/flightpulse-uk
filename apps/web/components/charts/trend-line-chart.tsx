"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatCompactNumber } from "@flightpulse/shared";

export interface TrendPoint {
  label: string;
  value: number;
}

export function TrendLineChart({
  data,
  valueLabel,
}: {
  data: TrendPoint[];
  valueLabel: string;
}) {
  return (
    <div
      className="h-64 w-full"
      role="img"
      aria-label={`Line chart of ${valueLabel} over time`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="label"
            stroke="var(--color-ink-faint)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--color-ink-faint)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatCompactNumber(v)}
          />
          <Tooltip
            formatter={(value: number) => [
              formatCompactNumber(value),
              valueLabel,
            ]}
            contentStyle={{
              background: "var(--color-paper-raised)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-sky-500)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
