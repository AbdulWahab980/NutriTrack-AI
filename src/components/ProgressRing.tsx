/**
 * Progress ring — green fill on a light-green track (spec §8).
 * Server component: pure SVG, no client JS needed.
 */
export function ProgressRing({
  value,
  target,
  label,
  unit,
  size = 104,
}: {
  value: number;
  target: number;
  label: string;
  unit: string;
  size?: number;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const over = target > 0 && value > target;

  const stroke = 9;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--track)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={over ? "var(--warning)" : "var(--primary)"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-semibold leading-none">
            {Math.round(value)}
          </span>
          <span className="mt-0.5 text-[10px] text-muted">
            / {Math.round(target)}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium">{label}</p>
      <p className="text-[10px] text-muted">{unit}</p>
    </div>
  );
}
