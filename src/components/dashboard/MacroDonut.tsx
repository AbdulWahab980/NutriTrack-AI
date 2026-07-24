"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

type Macro = { name: string; grams: number; color: string };

/**
 * Macronutrient balance donut. Slice sizes are by calorie contribution
 * (protein/carbs 4 kcal/g, fat 9), which is the honest split — grams alone
 * would understate fat.
 */
export function MacroDonut({
  proteinG,
  carbsG,
  fatG,
}: {
  proteinG: number;
  carbsG: number;
  fatG: number;
}) {
  const macros: Macro[] = [
    { name: "Protein", grams: Math.round(proteinG), color: "var(--macro-protein)" },
    { name: "Carbs", grams: Math.round(carbsG), color: "var(--macro-carbs)" },
    { name: "Fats", grams: Math.round(fatG), color: "var(--macro-fat)" },
  ];

  const kcal = [proteinG * 4, carbsG * 4, fatG * 9];
  const totalKcal = kcal.reduce((a, b) => a + b, 0);
  const pct = (i: number) =>
    totalKcal > 0 ? Math.round((kcal[i] / totalKcal) * 100) : 0;

  const data =
    totalKcal > 0
      ? macros.map((m, i) => ({ ...m, value: kcal[i] }))
      : [{ name: "empty", grams: 0, color: "var(--track)", value: 1 }];

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-[150px] w-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={48}
              outerRadius={70}
              paddingAngle={totalKcal > 0 ? 3 : 0}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex-1 space-y-3">
        {macros.map((m, i) => (
          <li key={m.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
              {m.name}
            </span>
            <span className="flex items-center gap-4">
              <span className="text-muted">{m.grams}g</span>
              <span className="w-9 text-right font-semibold">{pct(i)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
