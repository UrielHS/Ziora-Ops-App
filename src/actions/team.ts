"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { memberRoles, opsRoleEnum } from "@/db/schema";
import { formAction, type ActionState } from "@/lib/action";
import { requirePermission } from "@/lib/session";

const _setMemberRoles = formAction(
  z.object({ userId: z.uuid(), roles: z.array(z.enum(opsRoleEnum.enumValues)).default([]) }),
  async ({ userId, roles }) => {
    await requirePermission("team.manage");
    await db.transaction(async (tx) => {
      await tx.delete(memberRoles).where(eq(memberRoles.userId, userId));
      if (roles.length) await tx.insert(memberRoles).values(roles.map((role) => ({ userId, role })));
    });
    revalidatePath("/", "layout");
    return "Roles guardados";
  },
);

export async function setMemberRoles(prev: ActionState, fd: FormData) {
  return _setMemberRoles(prev, fd);
}
