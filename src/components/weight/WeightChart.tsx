"use client";

import {
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export type WeightPoint = { label: string; weightKg: number };

export function WeightChart({ points }: { points: WeightPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-[200px] items-center justify-center text-center text-sm text-muted">
        Log at least two days to see your weight trend.
      </div>
    );
  }

  // A little headroom above/below so the line isn't glued to the edges.
  const values = points.map((p) => p.weightKg);
  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
          <XAxis
            dataKey="label" tickLine={false} axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            interval="preserveStartEnd" minTickGap={24}
          />
          <YAxis
            domain={[min, max]} tickLine={false} axisLine={false} width={40}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
          />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }}
            formatter={(v) => [`${v} kg`, "Weight"]}
          />
          <Line
            type="monotone" dataKey="weightKg" stroke="var(--primary)" strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--primary)" }} activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
