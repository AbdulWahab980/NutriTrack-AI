import { requireAppUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { ReminderSettingsForm } from "@/components/ReminderSettingsForm";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";

export const metadata = { title: "Settings · NutriTrack AI" };

export default async function SettingsPage() {
  const user = await requireAppUser();
  const settings = await prisma.reminderSettings.findUnique({
    where: { userId: user.id },
  });

  const defaults = {
    waterRemindersEnabled: settings?.waterRemindersEnabled ?? true,
    waterReminderIntervalMin: settings?.waterReminderIntervalMin ?? 120,
    mealRemindersEnabled: settings?.mealRemindersEnabled ?? true,
    mealReminderHour: settings?.mealReminderHour ?? 20,
    weeklySummaryEnabled: settings?.weeklySummaryEnabled ?? true,
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted">{user.email}</p>
      </div>

      <div className="rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold">Reminders</h2>
        <p className="mt-1 text-xs text-muted">
          Reminders appear in the app while you&apos;re using it. Push
          notifications and email summaries aren&apos;t wired up yet.
        </p>
        <div className="mt-4">
          <ReminderSettingsForm defaults={defaults} />
        </div>
      </div>

      <div className="rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold">Export my data</h2>
        <p className="mt-1 text-sm text-muted">
          Download everything you&apos;ve logged as a CSV — profile, daily
          totals, every meal and water entry, weight history, and all guidance
          you were shown.
        </p>
        <a
          href="/api/export"
          className="mt-4 inline-block rounded-lg border border-border px-4 py-2.5 text-sm font-medium"
        >
          Download CSV
        </a>
      </div>

      <DeleteAccountForm email={user.email} />
    </section>
  );
}
