import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/shared";

export type SessionUser = typeof users.$inferSelect;

/** Correo con el que se entra sin Google. Solo en desarrollo; en producción siempre es null. */
export function devLoginEmail(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  return process.env.DEV_LOGIN_EMAIL?.toLowerCase() ?? null;
}

export const requireUser = cache(async (): Promise<SessionUser> => {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? devLoginEmail();
  if (!email) redirect("/login");
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.active) redirect("/login?error=AccessDenied");
  return user;
});
