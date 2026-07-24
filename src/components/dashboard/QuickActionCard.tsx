import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/components/icons";

export function QuickActionCard({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-primary">
        {icon}
      </span>
      <span className="flex items-end justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="mt-0.5 block text-xs text-muted">{subtitle}</span>
        </span>
        <ArrowRightIcon className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </span>
    </Link>
  );
}
