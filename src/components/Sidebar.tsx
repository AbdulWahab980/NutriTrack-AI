"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon, UtensilsIcon, SparkleIcon, AppleIcon, DropIcon, ScaleIcon,
  ChartIcon, TargetIcon, UserIcon, GearIcon, LeafIcon, FlameIcon,
} from "./icons";

const MAIN = [
  { href: "/today", label: "Dashboard", icon: HomeIcon },
  { href: "/log", label: "Food Log", icon: UtensilsIcon },
  { href: "/coach", label: "AI Coach", icon: SparkleIcon },
  { href: "/trends", label: "Nutrition", icon: AppleIcon },
  { href: "/log", label: "Water", icon: DropIcon, match: "__water" },
  { href: "/trends", label: "Weight", icon: ScaleIcon, match: "__weight" },
  { href: "/trends", label: "Trends", icon: ChartIcon },
  { href: "/profile", label: "Goals", icon: TargetIcon },
] as const;

const SECONDARY = [
  { href: "/profile", label: "Profile", icon: UserIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
] as const;

export function Sidebar({
  streakDays,
  streakGoal = 7,
}: {
  streakDays: number;
  streakGoal?: number;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const item = (href: string, label: string, Icon: typeof HomeIcon, active: boolean) => (
    <Link
      key={label}
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-surface text-primary"
          : "text-muted hover:bg-page hover:text-foreground"
      }`}
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </Link>
  );

  const filled = Math.min(streakGoal, streakDays);

  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-sidebar">
      <div className="flex h-full flex-col px-4 py-6">
        {/* logo */}
        <Link href="/today" className="flex items-center gap-2 px-2 pb-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-primary">
            <LeafIcon className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">NutriTrack</span>
        </Link>

        {/* main nav */}
        <nav className="flex flex-col gap-1">
          {MAIN.map((n) => item(n.href, n.label, n.icon, isActive(n.href)))}
        </nav>

        <div className="my-4 border-t border-border" />

        <nav className="flex flex-col gap-1">
          {SECONDARY.map((n) => item(n.href, n.label, n.icon, isActive(n.href)))}
        </nav>

        {/* streak widget */}
        <div className="mt-auto rounded-2xl bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-primary">
              <FlameIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-none">
                {streakDays} Day Streak
              </p>
              <p className="mt-1 text-xs text-muted">
                {streakDays > 0 ? "You're on fire!" : "Log today to start"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: streakGoal }, (_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${
                  i < filled ? "bg-primary" : "bg-white"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
