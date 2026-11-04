/**
 * Usuarios de Ziora Copilot (la app clínica en Firebase), vistos desde Ziora Ops.
 * El contrato del snapshot es estricto: si la app manda un campo no permitido (por ejemplo,
 * algo de un paciente), la sincronización completa se rechaza. Ver docs/PUENTE-ZIORA-APP.md.
 */
import { and, eq, isNull, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { appUserDaily, appUsers, planPrices } from "@/db/schema";
import { monthlyValue, type BillingPeriod } from "./sales";

export const SnapshotUser = z.strictObject({
  uid: z.string().min(1).max(128),
  email: z.email(),
  name: z.string().max(200).nullable().optional(),
  plan: z.string().min(1).max(40),
  status: z.string().min(1).max(40),
  createdAt: z.iso.datetime({ offset: true }).nullable().optional(),
  lastActiveAt: z.iso.datetime({ offset: true }).nullable().optional(),
  trialEndsAt: z.iso.datetime({ offset: true }).nullable().optional(),
  patientCount: z.number().int().min(0),
  sessionsLast30d: z.number().int().min(0).default(0),
});
export const Snapshot = z.strictObject({
  generatedAt: z.iso.datetime({ offset: true }),
  users: z.array(SnapshotUser).max(200_000),
});
export type SnapshotUser = z.infer<typeof SnapshotUser>;
export type Snapshot = z.infer<typeof Snapshot>;

export const ACTIVE_DAYS = 14;
const DAY = 86_400_000;

export function isActive(lastActiveAt: Date | null, now: Date, days = ACTIVE_DAYS) {
  return !!lastActiveAt && now.getTime() - lastActiveAt.getTime() <= days * DAY;
}

type Price = { plan: string; priceMxn: number; billingPeriod: BillingPeriod; paying: boolean };
type UserLike = { plan: string; status: string; lastActiveAt: Date | null; patientCount: number; removedAt?: Date | null };

const CANCELLED = /cancel|inactive|deleted|expired/i;

/** Cuenta que paga: plan marcado como de pago y estado no cancelado ni en prueba. */
export function isPaying(u: Pick<UserLike, "plan" | "status">, prices: Price[]) {
  const p = prices.find((x) => x.plan === u.plan);
  return !!p?.paying && !CANCELLED.test(u.status) && !/trial/i.test(u.status);
}

export function estimatedMrr(users: Pick<UserLike, "plan" | "status">[], prices: Price[]) {
  return users.reduce((sum, u) => {
    if (!isPaying(u, prices)) return sum;
    const p = prices.find((x) => x.plan === u.plan)!;
    return sum + monthlyValue(p.priceMxn, p.billingPeriod);
  }, 0);
}

export function summarizeByPlan(users: UserLike[], prices: Price[], now: Date) {
  const plans = [...new Set(users.map((u) => u.plan))].sort();
  return plans.map((plan) => {
    const us = users.filter((u) => u.plan === plan);
    return {
      plan,
      users: us.length,
      active: us.filter((u) => isActive(u.lastActiveAt, now)).length,
      paying: us.filter((u) => isPaying(u, prices)).length,
      patients: us.reduce((s, u) => s + u.patientCount, 0),
      estimatedMrrMxn: estimatedMrr(us, prices),
    };
  });
}

export type FollowupReason = "paying_inactive" | "trial_ending";

/** A quién conviene llamar: clientes de pago sin entrar 7+ días y trials que vencen en 4 días o menos. */
export function followupCandidates<T extends UserLike & { trialEndsAt: Date | null }>(users: T[], prices: Price[], now: Date) {
  const out: { user: T; reason: FollowupReason }[] = [];
  for (const u of users) {
    if (u.removedAt) continue;
    if (isPaying(u, prices) && !isActive(u.lastActiveAt, now, 7)) out.push({ user: u, reason: "paying_inactive" });
    else if (/trial/i.test(u.status) && u.trialEndsAt && u.trialEndsAt.getTime() >= now.getTime() && u.trialEndsAt.getTime() - now.getTime() <= 4 * DAY) {
      out.push({ user: u, reason: "trial_ending" });
    }
  }
  return out;
}

const mxDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(d);

/** Aplica un snapshot completo: upsert, marca bajas y guarda la foto diaria por plan. */
export async function applySnapshot(db: Db, snap: Snapshot, now = new Date()) {
  const toDate = (s?: string | null) => (s ? new Date(s) : null);
  const rows = snap.users.map((u) => ({
    uid: u.uid, email: u.email.toLowerCase(), name: u.name ?? null, plan: u.plan, status: u.status,
    signedUpAt: toDate(u.createdAt), lastActiveAt: toDate(u.lastActiveAt), trialEndsAt: toDate(u.trialEndsAt),
    patientCount: u.patientCount, sessionsLast30d: u.sessionsLast30d, syncedAt: now, removedAt: null,
  }));

  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i += 500) {
      await tx.insert(appUsers).values(rows.slice(i, i + 500)).onConflictDoUpdate({
        target: appUsers.uid,
        set: {
          email: sql`excluded.email`, name: sql`excluded.name`, plan: sql`excluded.plan`, status: sql`excluded.status`,
          signedUpAt: sql`excluded.signed_up_at`, lastActiveAt: sql`excluded.last_active_at`, trialEndsAt: sql`excluded.trial_ends_at`,
          patientCount: sql`excluded.patient_count`, sessionsLast30d: sql`excluded.sessions_last_30d`,
          syncedAt: sql`excluded.synced_at`, removedAt: sql`null`,
        },
      });
    }
    // Un snapshot vacío casi siempre es un error de la función, no "todos se fueron".
    if (rows.length > 0) {
      await tx.update(appUsers).set({ removedAt: now })
        .where(and(isNull(appUsers.removedAt), notInArray(appUsers.uid, rows.map((r) => r.uid))));
    }
  });

  const prices = await db.select().from(planPrices);
  const current = await db.select().from(appUsers).where(isNull(appUsers.removedAt));
  const day = mxDay(now);
  const summary = summarizeByPlan(current, prices, now);
  for (const s of summary) {
    await db.insert(appUserDaily).values({ day, ...s })
      .onConflictDoUpdate({ target: [appUserDaily.day, appUserDaily.plan], set: { users: s.users, active: s.active, paying: s.paying, patients: s.patients, estimatedMrrMxn: s.estimatedMrrMxn } });
  }
  const removed = (await db.select({ uid: appUsers.uid }).from(appUsers).where(eq(appUsers.removedAt, now))).length;
  return { users: rows.length, removed, plans: summary.length };
}
