"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellIcon, SearchIcon } from "./icons";

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function TopBar({
  firstName,
  subtitle,
  notifications,
}: {
  firstName: string;
  subtitle: string;
  notifications: number;
}) {
  // Time-of-day greeting resolves on the client, in the viewer's local time.
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);

  const initial = (firstName || "?").charAt(0).toUpperCase();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-4 pt-6 md:px-8">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-[28px]">
          {hour === null ? "Hello" : greeting(hour)}, {firstName}{" "}
          <span aria-hidden>👋</span>
        </h1>
        <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
      </div>

      {/* Right cluster is redundant on mobile (the mobile bar has the avatar). */}
      <div className="hidden items-center gap-3 md:flex">
        <div className="relative hidden sm:block">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search anything..."
            aria-label="Search"
            className="w-56 rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary lg:w-72"
          />
        </div>

        <Link
          href="/settings"
          aria-label={`Notifications${notifications ? `, ${notifications} new` : ""}`}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted hover:text-foreground"
        >
          <BellIcon className="h-5 w-5" />
          {notifications > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {notifications}
            </span>
          )}
        </Link>

        <Link
          href="/profile"
          aria-label="Profile"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-white"
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}
