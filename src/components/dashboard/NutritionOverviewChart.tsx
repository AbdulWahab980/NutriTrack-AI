"use client";

import { useState } from "react";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export type WeekPoint = {
  label: string;
  calories: number;
  proteinG: number;
  waterMl: number;
  logged: boolean;
};

const METRICS = {
  calories: { label: "Calories", key: "calories", unit: "kcal" },
  protein: { label: "Protein", key: "proteinG", unit: "g" },
  water: { label: "Water", key: "waterMl", unit: "ml" },
} as const;

type MetricKey = keyof typeof METRICS;

export function NutritionOverviewChart({ days }: { days: WeekPoint[] }) {
  const [metric, setMetric] = useState<MetricKey>("calories");
  const m = METRICS[metric];

  // Unlogged days are gaps, not zeros — plotting 0 would imply "ate nothing".
  const data = days.map((d) => ({
    label: d.label,
    value: d.logged ? (d[m.key as keyof WeekPoint] as number) : null,
  }));

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold">Nutrition Overview</h2>
          <p className="text-xs text-muted">This Week</p>
        </div>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as MetricKey)}
          aria-label="Metric"
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-primary"
        >
          {Object.entries(METRICS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="ntArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label" tickLine={false} axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
            />
            <YAxis
              tickLine={false} axisLine={false} width={44}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
            />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }}
              formatter={(v) => [typeof v === "number" ? `${Math.round(v)} ${m.unit}` : "—", m.label]}
            />
            <Area
              type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2.5}
              fill="url(#ntArea)" dot={{ r: 3, fill: "var(--primary)" }}
              activeDot={{ r: 5 }} connectNulls isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
