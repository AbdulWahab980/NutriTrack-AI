import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { signup } from "@/app/auth/actions";

export const metadata = { title: "Create account · NutriTrack AI" };

export default function SignupPage() {
  return (
    <section className="mx-auto max-w-sm pt-8">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">
        We&apos;ll set up your daily targets next.
      </p>
      <div className="mt-8">
        <Suspense>
          <AuthForm mode="signup" action={signup} />
        </Suspense>
      </div>
    </section>
  );
}
