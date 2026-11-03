"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { accountTypeEnum, billingPeriodEnum, contractStatusEnum, dealStageEnum } from "@/db/schema";
import * as sales from "@/domain/sales";
import { formAction, type ActionState } from "@/lib/action";
import { requirePermission } from "@/lib/session";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const mxn = z.coerce.number().int().min(0).max(100_000_000);

const accountFields = z.object({
  name: z.string().trim().min(2).max(160),
  type: z.enum(accountTypeEnum.enumValues),
  city: z.string().trim().max(80).optional(),
  website: z.url().optional(),
  ownerId: z.uuid().optional(),
  therapistsCount: z.coerce.number().int().min(0).max(100000).optional(),
  notes: z.string().max(5000).optional(),
  organizationId: z.uuid().optional(),
});
const toAccount = (d: z.infer<typeof accountFields>) => ({
  name: d.name, type: d.type, city: d.city ?? null, website: d.website ?? null, ownerId: d.ownerId ?? null,
  therapistsCount: d.therapistsCount ?? null, notes: d.notes ?? null, organizationId: d.organizationId ?? null,
});

const _saveAccount = formAction(accountFields.extend({ id: z.uuid().optional() }), async ({ id, ...d }) => {
  await requirePermission("sales.manage");
  await sales.saveAccount(db, id ?? null, toAccount(d));
  revalidatePath("/sales", "layout");
  return id ? "Cuenta guardada." : "Cuenta creada.";
});

const _addAccountContact = formAction(
  z.object({
    accountId: z.uuid(), name: z.string().trim().min(2).max(160), email: z.email(),
    phone: z.string().trim().max(40).optional(), title: z.string().trim().max(120).optional(), decisionMaker: z.literal("on").optional(),
  }),
  async ({ accountId, decisionMaker, ...p }) => {
    await requirePermission("sales.manage");
    await sales.addAccountContact(db, accountId, { ...p, decisionMaker: decisionMaker === "on" });
    revalidatePath("/sales", "layout");
    return "Contacto agregado (también aparece en Contactos y en Event Ops).";
  },
);

const dealFields = z.object({
  accountId: z.uuid(),
  name: z.string().trim().min(2).max(160),
  stage: z.enum(dealStageEnum.enumValues).default("prospect"),
  seats: z.coerce.number().int().min(0).max(100000).optional(),
  amountMxn: mxn.optional(),
  billingPeriod: z.enum(billingPeriodEnum.enumValues).default("monthly"),
  expectedCloseOn: isoDate.optional(),
  ownerId: z.uuid().optional(),
  lostReason: z.string().trim().max(1000).optional(),
  notes: z.string().max(5000).optional(),
});

const _saveDeal = formAction(dealFields.extend({ id: z.uuid().optional() }), async ({ id, ...d }) => {
  const { user } = await requirePermission("sales.manage");
  await sales.saveDeal(db, id ?? null, {
    ...d, seats: d.seats ?? null, amountMxn: d.amountMxn ?? null, expectedCloseOn: d.expectedCloseOn ?? null,
    ownerId: d.ownerId ?? user.id, lostReason: d.lostReason ?? null, notes: d.notes ?? null,
  });
  revalidatePath("/sales", "layout");
  return d.stage === "won" ? "¡Ganada! Se creó el borrador del contrato." : "Oportunidad guardada.";
});

export async function moveDeal(id: string, stage: string) {
  await requirePermission("sales.manage");
  await sales.moveDeal(db, z.uuid().parse(id), z.enum(dealStageEnum.enumValues).parse(stage));
  revalidatePath("/sales", "layout");
}

const _saveContract = formAction(
  z.object({
    id: z.uuid().optional(),
    accountId: z.uuid(),
    title: z.string().trim().min(2).max(160),
    seats: z.coerce.number().int().min(0).max(100000).optional(),
    pricePerSeatMxn: mxn.optional(),
    amountMxn: mxn.optional(),
    billingPeriod: z.enum(billingPeriodEnum.enumValues),
    startsOn: isoDate.optional(),
    endsOn: isoDate.optional(),
    autoRenew: z.literal("on").optional(),
    status: z.enum(contractStatusEnum.enumValues),
    documentUrl: z.url().optional(),
    notes: z.string().max(5000).optional(),
  }),
  async ({ id, autoRenew, ...c }) => {
    const { user } = await requirePermission("sales.manage");
    await sales.saveContract(db, user, id ?? null, {
      ...c, autoRenew: autoRenew === "on", seats: c.seats ?? null, pricePerSeatMxn: c.pricePerSeatMxn ?? null,
      amountMxn: c.amountMxn ?? 0, startsOn: c.startsOn ?? null, endsOn: c.endsOn ?? null,
      documentUrl: c.documentUrl ?? null, notes: c.notes ?? null,
    });
    revalidatePath("/sales", "layout");
    return "Contrato guardado.";
  },
);

// Next exige que cada export de un archivo "use server" sea una función async declarada.
export async function saveAccount(prev: ActionState, fd: FormData) {
  return _saveAccount(prev, fd);
}
export async function addAccountContact(prev: ActionState, fd: FormData) {
  return _addAccountContact(prev, fd);
}
export async function saveDeal(prev: ActionState, fd: FormData) {
  return _saveDeal(prev, fd);
}
export async function saveContract(prev: ActionState, fd: FormData) {
  return _saveContract(prev, fd);
}
