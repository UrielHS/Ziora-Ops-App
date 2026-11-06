"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { setAppUserTest } from "@/domain/app-users";
import { formAction, type ActionState } from "@/lib/action";
import { requirePermission } from "@/lib/session";

const _markTest = formAction(
  z.object({ uid: z.string().min(1).max(128), isTest: z.enum(["1", "0"]) }),
  async ({ uid, isTest }) => {
    await requirePermission("customers.view");
    await setAppUserTest(db, uid, isTest === "1");
    revalidatePath("/customers");
    revalidatePath("/dashboard");
  },
);

// Next exige que cada export de un archivo "use server" sea una función async declarada.
export async function markAppUserTest(prev: ActionState, fd: FormData) {
  return _markTest(prev, fd);
}
