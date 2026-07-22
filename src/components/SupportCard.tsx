import { SUPPORT_MESSAGE } from "@/lib/safety/screen";

/**
 * Shown in place of nutrition guidance when the safety screen trips.
 * Contains no numbers, no targets, and no dietary direction by design.
 */
export function SupportCard() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h2 className="text-base font-semibold">{SUPPORT_MESSAGE.heading}</h2>
      <p className="mt-2 text-sm text-foreground">{SUPPORT_MESSAGE.body}</p>
      <ul className="mt-4 space-y-2">
        {SUPPORT_MESSAGE.suggestions.map((s) => (
          <li key={s} className="flex gap-2 text-sm text-foreground">
            <span aria-hidden className="text-primary">
              &bull;
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">{SUPPORT_MESSAGE.footer}</p>
    </div>
  );
}
