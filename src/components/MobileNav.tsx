"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LeafIcon, FlameIcon } from "./icons";
import { MAIN_NAV, SECONDARY_NAV, type NavItem } from "./nav-items";

/**
 * Mobile navigation (md:hidden). The desktop sidebar is hidden on small
 * screens, so without this there is no way to navigate on a phone. A top app
 * bar with a hamburger opens a slide-in drawer sharing the same nav list.
 */
export function MobileNav({
  firstName,
  streakDays,
}: {
  firstName: string;
  streakDays: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes (i.e. after a tap).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const link = (n: NavItem) => {
    const active = isActive(n.href);
    const Icon = n.icon;
    return (
      <Link
        key={n.label}
        href={n.href}
        className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium ${
          active ? "bg-surface text-primary" : "text-muted"
        }`}
      >
        <Icon className="h-5 w-5" />
        {n.label}
      </Link>
    );
  };

  const initial = (firstName || "?").charAt(0).toUpperCase();

  return (
    <div className="md:hidden">
      {/* top app bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-sidebar px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link href="/today" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-primary">
            <LeafIcon className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold">NutriTrack</span>
        </Link>

        <Link
          href="/profile"
          aria-label="Profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-white"
        >
          {initial}
        </Link>
      </div>

      {/* drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-sidebar px-4 py-5 shadow-xl">
            <div className="flex items-center justify-between pb-4">
              <Link href="/today" className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-primary">
                  <LeafIcon className="h-5 w-5" />
                </span>
                <span className="text-lg font-semibold">NutriTrack</span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
              {MAIN_NAV.map(link)}
              <div className="my-3 border-t border-border" />
              {SECONDARY_NAV.map(link)}
            </nav>

            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface p-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-primary">
                <FlameIcon className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold">{streakDays} Day Streak</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
