import { requireOnboardedUser } from "@/lib/user";
import { ScanFlow } from "@/components/scan/ScanFlow";

export const metadata = { title: "Scan a meal · NutriTrack AI" };

export default async function ScanPage() {
  await requireOnboardedUser();

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Scan a meal</h1>
        <p className="mt-1 text-sm text-muted">
          Take a photo of your plate and I&apos;ll identify the food. You review
          and confirm before anything is logged — same as typing it.
        </p>
      </div>
      <ScanFlow />
    </div>
  );
}
