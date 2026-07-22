"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Reports the browser's IANA timezone into a cookie so the server can resolve
 * "today" correctly. Refreshes once when the value changes (first visit or
 * travel), then stays quiet.
 */
export function TimezoneSync({ current }: { current: string }) {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz === current) return;

    // Lax + a long max-age; this is a display preference, not a credential.
    document.cookie = `ntz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [current, router]);

  return null;
}
