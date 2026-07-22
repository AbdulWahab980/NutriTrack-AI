"use client";

import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayPoint } from "@/lib/trends";

type Props = {
  days: DayPoint[];
  dataKey: "calories" | "proteinG" | "waterMl" | "weightKg";
  target?: number;
  unit: string;
};

export function TrendChart({ days, dataKey, target, unit }: Props) {
  // Unlogged days are gaps, not zeros — plotting them as 0 would imply the
  // user ate nothing rather than simply not logging.
  const data = days.map((d) => ({
    label: d.label,
    value: d.logged || dataKey === "weightKg" ? d[dataKey] : null,
  }));

  const hasAny = data.some((d) => d.value !== null && d.value !== 0);
  if (!hasAny) {
    return (
      <div className="flex h-[160px] items-center justify-center text-xs text-muted">
        Nothing logged in this range yet.
      </div>
    );
  }

  return (
    <div className="h-[160px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 12,
            }}
            formatter={(v) => [
              typeof v === "number" ? `${Math.round(v)} ${unit}` : "-",
              "",
            ]}
          />
          {target !== undefined && target > 0 && (
            <ReferenceLine
              y={target}
              stroke="var(--secondary)"
              strokeDasharray="4 4"
              label={{
                value: "target",
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--muted)",
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--primary)" }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
