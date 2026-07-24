import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { getOptionalUserWithProfile } from "@/lib/user";
import { computeStreaks } from "@/lib/trends";
import { getToday } from "@/lib/date";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NutriTrack AI",
  description:
    "AI-powered meal & water tracking with budget-aware, hostel-friendly nutrition guidance.",
};

const SUBTITLE = "Stay consistent, your future self will thank you.";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Shell chrome (greeting, streak, notifications) is derived once here so
  // every authenticated page shares it. Never redirects — safe on /login.
  const account = await getOptionalUserWithProfile();

  let firstName = "there";
  let streakDays = 0;
  let notifications = 0;

  if (account?.user && account.profile) {
    firstName =
      account.user.fullName?.trim().split(/\s+/)[0] ||
      account.email.split("@")[0];

    const { date } = await getToday();
    const streaks = await computeStreaks(
      account.user.id,
      date,
      account.profile.targetWaterMl,
    );
    streakDays = streaks.loggingCurrent;
    // A gentle "log today" nudge when nothing is logged yet.
    notifications = streaks.loggingCurrent === 0 ? 1 : 0;
  }

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-page text-foreground">
        <AppShell
          firstName={firstName}
          subtitle={SUBTITLE}
          streakDays={streakDays}
          notifications={notifications}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
