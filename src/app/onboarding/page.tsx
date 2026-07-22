import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { saveProfile } from "./actions";
import { getUserWithProfile } from "@/lib/user";

export const metadata = { title: "Set up your profile · NutriTrack AI" };

export default async function OnboardingPage() {
  const { user, profile } = await getUserWithProfile();

  // Already onboarded — edit from the profile screen instead.
  if (profile) {
    redirect("/profile");
  }

  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Set up your profile</h1>
      <p className="mt-1 text-sm text-muted">
        We use this to calculate your daily calorie, macro, and water targets.
        You can change any of it later.
      </p>
      <div className="mt-8">
        <ProfileForm action={saveProfile} defaults={{ fullName: user.fullName }} />
      </div>
      <p className="mt-6 text-xs text-muted">
        NutriTrack AI provides general nutrition guidance, not medical advice.
        Consult a doctor or registered dietitian for medical conditions.
      </p>
    </section>
  );
}
