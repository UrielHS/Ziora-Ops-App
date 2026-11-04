"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { appUsers, billingPeriodEnum, followupChannelEnum, followups, healthEnum, planPrices } from "@/db/schema";
import * as f from "@/domain/followups";
import { formAction, type ActionState } from "@/lib/action";
import { requirePermission } from "@/lib/session";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const _createFollowup = formAction(
  z.object({
    title: z.string().trim().min(2).max(200),
    appUserEmail: z.email().optional(),
    appUserUid: z.string().max(128).optional(),
    accountId: z.uuid().optional(),
    channel: z.enum(followupChannelEnum.enumValues),
    dueOn: isoDate,
    ownerId: z.uuid().optional(),
    nextAction: z.string().trim().max(500).optional(),
  }),
  async ({ appUserEmail, ...d }) => {
    const { user } = await requirePermission("followups.manage");
    let uid = d.appUserUid;
    if (!uid && appUserEmail) {
      const [u] = await db.select({ uid: appUsers.uid }).from(appUsers).where(eq(appUsers.email, appUserEmail.toLowerCase()));
      if (!u) throw new Error("No encontramos ese correo entre los usuarios de Ziora.");
      uid = u.uid;
    }
    await f.createFollowup(db, { ...d, appUserUid: uid ?? null, accountId: d.accountId ?? null, ownerId: d.ownerId ?? user.id, nextAction: d.nextAction ?? null });
    revalidatePath("/", "layout");
    return "Seguimiento agendado.";
  },
);

const _completeFollowup = formAction(
  z.object({
    id: z.uuid(),
    outcome: z.string().trim().min(2, "escribe cómo fue").max(3000),
    health: z.enum(healthEnum.enumValues),
    nextDueOn: isoDate.optional(),
    nextAction: z.string().trim().max(500).optional(),
    nextChannel: z.enum(followupChannelEnum.enumValues).optional(),
  }),
  async (d) => {
    await requirePermission("followups.manage");
    const r = await f.completeFollowup(db, d);
    revalidatePath("/", "layout");
    return r.nextId ? "Guardado. Agendamos el siguiente seguimiento." : "Seguimiento cerrado.";
  },
);

export async function cancelFollowup(fd: FormData) {
  await requirePermission("followups.manage");
  await db.update(followups).set({ status: "cancelled" }).where(eq(followups.id, z.uuid().parse(fd.get("id"))));
  revalidatePath("/", "layout");
}

export async function suggestFollowupsNow() {
  await requirePermission("followups.manage");
  await f.closeStaleSuggestions(db);
  await f.suggestFollowups(db);
  revalidatePath("/", "layout");
}

const _savePlanPrice = formAction(
  z.object({
    plan: z.string().trim().min(1).max(40),
    label: z.string().trim().min(1).max(60),
    priceMxn: z.coerce.number().int().min(0).max(1_000_000),
    billingPeriod: z.enum(billingPeriodEnum.enumValues),
    paying: z.literal("on").optional(),
  }),
  async ({ paying, ...p }) => {
    await requirePermission("revenue.view");
    await db.insert(planPrices).values({ ...p, paying: paying === "on" })
      .onConflictDoUpdate({ target: planPrices.plan, set: { label: p.label, priceMxn: p.priceMxn, billingPeriod: p.billingPeriod, paying: paying === "on" } });
    revalidatePath("/customers");
    return "Precio guardado. El MRR estimado se recalcula en la siguiente sincronización.";
  },
);

// Next exige que cada export de un archivo "use server" sea una función async declarada.
export async function createFollowup(prev: ActionState, fd: FormData) {
  return _createFollowup(prev, fd);
}
export async function completeFollowup(prev: ActionState, fd: FormData) {
  return _completeFollowup(prev, fd);
}
export async function savePlanPrice(prev: ActionState, fd: FormData) {
  return _savePlanPrice(prev, fd);
}
