/** Seguimiento 1:1 de terapeutas (usuarios de la app), cuentas B2B y demos. */
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { appUsers, followups, memberRoles, planPrices } from "@/db/schema";
import { users } from "@/db/shared";
import { followupCandidates } from "./app-users";

type Followup = typeof followups.$inferSelect;
export type FollowupInput = Pick<Followup, "title" | "channel" | "dueOn"> &
  Partial<Pick<Followup, "appUserUid" | "accountId" | "demoId" | "ownerId" | "nextAction">>;

export async function createFollowup(db: Db, f: FollowupInput) {
  if (!f.appUserUid && !f.accountId && !f.demoId) throw new Error("Elige a quién se le da seguimiento.");
  const [row] = await db.insert(followups).values({ ...f, reason: "manual" }).returning({ id: followups.id });
  return row.id;
}

export type Completion = {
  id: string; outcome: string; health: NonNullable<Followup["health"]>;
  nextDueOn?: string; nextAction?: string; nextChannel?: Followup["channel"];
};

/** Registra el resultado. Si se indica fecha siguiente, agenda el próximo seguimiento con el mismo dueño. */
export async function completeFollowup(db: Db, c: Completion) {
  if (!c.outcome.trim()) throw new Error("Escribe cómo fue el seguimiento.");
  const [f] = await db.select().from(followups).where(eq(followups.id, c.id));
  if (!f) throw new Error("El seguimiento ya no existe.");
  if (f.status !== "pending") throw new Error("Este seguimiento ya se cerró.");
  let nextId: string | null = null;
  await db.transaction(async (tx) => {
    await tx.update(followups).set({
      status: "done", outcome: c.outcome.trim(), health: c.health, nextAction: c.nextAction?.trim() || null, completedAt: new Date(),
    }).where(eq(followups.id, f.id));
    if (c.nextDueOn) {
      const [n] = await tx.insert(followups).values({
        title: c.nextAction?.trim() || f.title, appUserUid: f.appUserUid, accountId: f.accountId, demoId: f.demoId,
        channel: c.nextChannel ?? f.channel, dueOn: c.nextDueOn, ownerId: f.ownerId, reason: "manual",
      }).returning({ id: followups.id });
      nextId = n.id;
    }
  });
  return { nextId };
}

const REASON_TITLE = {
  paying_inactive: "Cliente de pago sin entrar hace 7+ días",
  trial_ending: "Su prueba vence pronto",
} as const;

/**
 * Crea seguimientos sugeridos (idempotente: el índice único evita duplicar mientras haya uno pendiente).
 * Se asignan al director clínico; si no hay, quedan sin dueño.
 */
export async function suggestFollowups(db: Db, now = new Date(), today?: string) {
  const day = today ?? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(now);
  const [prices, current, [director]] = await Promise.all([
    db.select().from(planPrices),
    db.select().from(appUsers).where(and(isNull(appUsers.removedAt), eq(appUsers.isTest, false))),
    db.select({ id: users.id }).from(memberRoles).innerJoin(users, eq(users.id, memberRoles.userId))
      .where(and(eq(memberRoles.role, "clinical_director"), eq(users.active, true))).limit(1),
  ]);
  const candidates = followupCandidates(current, prices, now);
  if (candidates.length === 0) return { created: 0 };
  const created = await db.insert(followups).values(candidates.map((c) => ({
    title: REASON_TITLE[c.reason], appUserUid: c.user.uid, channel: "call" as const, dueOn: day,
    reason: c.reason, ownerId: director?.id ?? null,
  }))).onConflictDoNothing().returning({ id: followups.id });
  return { created: created.length };
}

/** Cierra sugerencias que ya no aplican (el usuario volvió a entrar o ya pagó). */
export async function closeStaleSuggestions(db: Db, now = new Date()) {
  const [prices, pending] = await Promise.all([
    db.select().from(planPrices),
    db.select({ id: followups.id, reason: followups.reason, uid: followups.appUserUid }).from(followups)
      .where(and(eq(followups.status, "pending"), inArray(followups.reason, ["paying_inactive", "trial_ending"]))),
  ]);
  if (pending.length === 0) return 0;
  // Una cuenta marcada como prueba deja de "seguir aplicando": su sugerencia pendiente se cierra.
  const us = await db.select().from(appUsers).where(and(inArray(appUsers.uid, pending.map((p) => p.uid!).filter(Boolean)), eq(appUsers.isTest, false)));
  const still = new Set(followupCandidates(us, prices, now).map((c) => `${c.user.uid}:${c.reason}`));
  const stale = pending.filter((p) => !still.has(`${p.uid}:${p.reason}`)).map((p) => p.id);
  if (stale.length) await db.update(followups).set({ status: "cancelled", outcome: "Ya no aplica (se resolvió solo)." }).where(inArray(followups.id, stale));
  return stale.length;
}
