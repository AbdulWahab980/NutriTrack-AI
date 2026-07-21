export function PagePlaceholder({
  title,
  phase,
  children,
}: {
  title: string;
  phase: string;
  children?: React.ReactNode;
}) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-6 rounded-xl border border-border bg-surface p-6">
        <p className="text-sm font-medium text-primary">{phase}</p>
        <p className="mt-1 text-sm text-muted">
          {children ?? "This screen is scaffolded and will be built in an upcoming phase."}
        </p>
      </div>
    </section>
  );
}
