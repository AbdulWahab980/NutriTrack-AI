import type { ReactNode } from "react";

/**
 * Stat card: label + big value on the left, a progress ring with a centred
 * icon on the right. Matches the dashboard's top metric row.
 */
export function StatCard({
  label,
  value,
  unit,
  sub,
  percent,
  icon,
  over = false,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  percent: number;
  icon: ReactNode;
  over?: boolean;
}) {
  const size = 76;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent));
  const dash = (pct / 100) * c;
  const color = over ? "var(--warning)" : "var(--primary)";

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5">
      <div className="min-w-0">
        <p className="truncate text-sm text-muted">{label}</p>
        <p className="mt-1 text-2xl font-bold leading-none">
          {value}
          {unit && <span className="ml-1 text-sm font-medium text-muted">{unit}</span>}
        </p>
        <p className="mt-1.5 text-xs text-muted">{sub}</p>
      </div>

      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-primary">
          {icon}
        </span>
      </div>
    </div>
  );
}
