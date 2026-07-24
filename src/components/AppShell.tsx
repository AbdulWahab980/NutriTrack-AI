"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/** Routes rendered without the dashboard chrome (auth + onboarding flows). */
const BARE_ROUTES = ["/login", "/signup", "/onboarding"];

export function AppShell({
  firstName,
  subtitle,
  streakDays,
  notifications,
  children,
}: {
  firstName: string;
  subtitle: string;
  streakDays: number;
  notifications: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );

  if (bare) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar streakDays={streakDays} />
      <div className="nt-scroll flex min-w-0 flex-1 flex-col">
        <TopBar
          firstName={firstName}
          subtitle={subtitle}
          notifications={notifications}
        />
        <main className="flex-1 px-5 py-6 md:px-8">{children}</main>
        {/* Persistent medical disclaimer (spec §3.8). */}
        <footer className="px-5 pb-6 pt-2 md:px-8">
          <p className="text-center text-xs text-muted">
            NutriTrack AI provides general nutrition guidance, not medical
            advice. Consult a doctor or registered dietitian for medical
            conditions.
          </p>
        </footer>
      </div>
    </div>
  );
}
