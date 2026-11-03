"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { requireUser } from "@/lib/session";

export async function updateGoalCurrent(fd: FormData) {
  await requireUser();
  const id = z.uuid().parse(fd.get("id"));
  const current = z.coerce.number().int().min(0).max(10_000_000).parse(fd.get("current"));
  await db.update(goals).set({ current }).where(eq(goals.id, id));
  revalidatePath("/", "layout");
}
