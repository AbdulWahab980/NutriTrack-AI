import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Resolves the Supabase auth user to our own `users` row, creating it on
 * first sight. Redirects to /login when there is no session.
 */
export async function requireAppUser() {
  const authUser = await getCurrentUser();
  if (!authUser?.email) {
    redirect("/login");
  }

  return prisma.user.upsert({
    where: { supabaseUserId: authUser.id },
    update: { lastLoginAt: new Date() },
    create: {
      supabaseUserId: authUser.id,
      email: authUser.email,
      lastLoginAt: new Date(),
    },
  });
}

/** The signed-in user plus their profile, or null profile if not onboarded. */
export async function getUserWithProfile() {
  const user = await requireAppUser();
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });
  return { user, profile };
}

/** Like the above, but sends un-onboarded users to the onboarding flow. */
export async function requireOnboardedUser() {
  const { user, profile } = await getUserWithProfile();
  if (!profile) {
    redirect("/onboarding");
  }
  return { user, profile };
}
