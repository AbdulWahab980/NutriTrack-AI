import { cookies } from "next/headers";

/**
 * "Today" must be the user's local day, not the server's UTC day — a meal
 * logged at 1am in Karachi (UTC+5) belongs to that date, not the previous one.
 * The browser reports its IANA zone into a cookie; UTC is the fallback for the
 * very first render before that cookie exists.
 */

export const TZ_COOKIE = "ntz";

export function localDateString(timeZone: string, date = new Date()): string {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

/** The viewer's timezone from the cookie, or UTC. */
export async function getTimeZone(): Promise<string> {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  return tz && tz.length < 64 ? tz : "UTC";
}

/** Today's date in the viewer's zone, as a UTC-midnight Date for @db.Date. */
export async function getToday(): Promise<{ iso: string; date: Date }> {
  const iso = localDateString(await getTimeZone());
  const [y, m, d] = iso.split("-").map(Number);
  return { iso, date: new Date(Date.UTC(y, m - 1, d)) };
}

export function formatFriendlyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
