"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatCompactNumber } from "@flightpulse/shared";

export interface RankingBar {
  label: string;
  value: number;
}

export function RankingBarChart({
  data,
  valueLabel,
}: {
  data: RankingBar[];
  valueLabel: string;
}) {
  return (
    <div
      className="w-full"
      style={{ height: Math.max(288, data.length * 44) }}
      role="img"
      aria-label={`Bar chart ranking by ${valueLabel}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            horizontal={false}
          />
          <XAxis
            type="number"
            stroke="var(--color-ink-faint)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatCompactNumber(v)}
          />
          <YAxis
            type="category"
            dataKey="label"
            stroke="var(--color-ink-faint)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={140}
            interval={0}
          />
          <Tooltip
            formatter={(value: number) => [
              formatCompactNumber(value),
              valueLabel,
            ]}
            contentStyle={{
              background: "var(--color-paper-raised)",
              border: "1px solid var(--color-border)",
              borderRadius: 0,
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="value"
            fill="var(--color-accent-500)"
            radius={[0, 0, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
