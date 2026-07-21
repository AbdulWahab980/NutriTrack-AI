// Persistent, visible medical disclaimer (spec §3.8, non-negotiable).
export function Disclaimer() {
  return (
    <p className="fixed inset-x-0 bottom-[52px] z-30 mx-auto max-w-2xl bg-surface px-4 py-1.5 text-center text-[11px] leading-tight text-muted">
      NutriTrack AI provides general nutrition guidance, not medical advice.
      Consult a doctor or registered dietitian for medical conditions.
    </p>
  );
}
