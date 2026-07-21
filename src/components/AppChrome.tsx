"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { Disclaimer } from "./Disclaimer";

/** Routes that render without the bottom nav (auth + onboarding flows). */
const BARE_ROUTES = ["/login", "/signup", "/onboarding"];

export function AppChrome() {
  const pathname = usePathname();
  const bare = BARE_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );
  if (bare) return null;

  return (
    <>
      <Disclaimer />
      <BottomNav />
    </>
  );
}
