import { SparkleIcon } from "@/components/icons";

/**
 * Passive AI insight strip. The text is a factual gap statement computed
 * locally (no API call, no verdict) — see spec §3.4. The mascot is inline SVG.
 */
export function AiInsightCard({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <SparkleIcon className="h-4 w-4" />
          AI Insight
        </p>
        <p className="mt-2 max-w-md text-sm text-foreground">{text}</p>
      </div>
      <RobotMascot className="hidden h-20 w-20 shrink-0 sm:block" />
    </div>
  );
}

function RobotMascot({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 96 96" fill="none" aria-hidden>
      <rect x="26" y="30" width="44" height="36" rx="12" fill="var(--secondary)" />
      <rect x="33" y="39" width="30" height="18" rx="9" fill="#ffffff" />
      <circle cx="42" cy="48" r="3.4" fill="var(--primary)" />
      <circle cx="54" cy="48" r="3.4" fill="var(--primary)" />
      <path d="M44 76c0-3 8-3 8 0" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 22v8M48 22a4 4 0 1 0 0-.1Z" stroke="var(--secondary)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="48" cy="19" r="3.2" fill="var(--primary)" />
      <rect x="20" y="44" width="6" height="12" rx="3" fill="var(--secondary)" />
      <rect x="70" y="44" width="6" height="12" rx="3" fill="var(--secondary)" />
      <path d="M74 40c6-2 10 2 8 7" stroke="var(--secondary)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
