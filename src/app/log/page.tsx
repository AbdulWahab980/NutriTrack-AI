import { LogChat } from "@/components/LogChat";
import { requireOnboardedUser } from "@/lib/user";

export const metadata = { title: "Log a meal · NutriTrack AI" };

export default async function LogPage() {
  await requireOnboardedUser();

  return (
    <section>
      <h1 className="text-2xl font-semibold">Log a meal</h1>
      <p className="mt-1 text-sm text-muted">
        Describe your day in your own words. I&apos;ll pull out the items and
        look up real nutrition numbers — never guessed.
      </p>
      <div className="mt-6">
        <LogChat />
      </div>
    </section>
  );
}
