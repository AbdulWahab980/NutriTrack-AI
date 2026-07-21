import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { login } from "@/app/auth/actions";

export const metadata = { title: "Sign in · NutriTrack AI" };

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-sm pt-8">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">
        Sign in to keep logging your meals and water.
      </p>
      <div className="mt-8">
        <Suspense>
          <AuthForm mode="login" action={login} />
        </Suspense>
      </div>
    </section>
  );
}
