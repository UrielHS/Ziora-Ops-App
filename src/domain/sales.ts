/**
 * Ventas B2B (clínicas, universidades, hospitales e instituciones).
 * Funciones puras arriba (probadas en sales.test.ts); acciones sobre la base abajo.
 */
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { accountContacts, accounts, contracts, deals } from "@/db/schema";
import type { Actor } from "./content";
import { upsertContact } from "./contacts";

type Deal = typeof deals.$inferSelect;
type Contract = typeof contracts.$inferSelect;
export type DealStage = Deal["stage"];
export type BillingPeriod = Contract["billingPeriod"];

/** Probabilidad de cierre por etapa, para el valor ponderado del pipeline. */
export const STAGE_PROBABILITY: Record<DealStage, number> = {
  prospect: 0.1, meeting: 0.25, proposal: 0.45, negotiation: 0.7, won: 1, lost: 0,
};

export const OPEN_STAGES: DealStage[] = ["prospect", "meeting", "proposal", "negotiation"];

/** Ingreso mensual equivalente de un monto según su periodo de cobro. */
export function monthlyValue(amountMxn: number | null, period: BillingPeriod) {
  if (!amountMxn) return 0;
  if (period === "annual") return Math.round(amountMxn / 12);
  if (period === "one_time") return 0;
  return amountMxn;
}

export function weightedPipeline(ds: Pick<Deal, "stage" | "amountMxn" | "billingPeriod">[]) {
  return Math.round(
    ds.filter((d) => OPEN_STAGES.includes(d.stage)).reduce((sum, d) => sum + monthlyValue(d.amountMxn, d.billingPeriod) * STAGE_PROBABILITY[d.stage], 0),
  );
}

const DAY = 86_400_000;
const daysBetween = (fromISO: string, toISO: string) => Math.round((Date.parse(`${toISO}T12:00:00Z`) - Date.parse(`${fromISO}T12:00:00Z`)) / DAY);

/** Contrato vigente en la fecha (firmado o activo, ya empezó y no ha terminado). */
export function isLive(c: Pick<Contract, "status" | "startsOn" | "endsOn" | "autoRenew">, today: string) {
  if (!["signed", "active"].includes(c.status)) return false;
  if (c.startsOn && c.startsOn > today) return false;
  if (c.endsOn && c.endsOn < today && !c.autoRenew) return false;
  return true;
}

export function contractedMrr(cs: Pick<Contract, "status" | "startsOn" | "endsOn" | "autoRenew" | "amountMxn" | "billingPeriod">[], today: string) {
  return cs.filter((c) => isLive(c, today)).reduce((sum, c) => sum + monthlyValue(c.amountMxn, c.billingPeriod), 0);
}

export type ContractAlert = { contractId: string; kind: "expired" | "expiring"; days: number };

/** Vigentes que vencen en los próximos `withinDays` (o ya vencieron sin renovación automática). */
export function contractAlerts(cs: Pick<Contract, "id" | "status" | "endsOn" | "autoRenew">[], today: string, withinDays = 60): ContractAlert[] {
  const out: ContractAlert[] = [];
  for (const c of cs) {
    if (!c.endsOn || !["signed", "active"].includes(c.status)) continue;
    const days = daysBetween(today, c.endsOn);
    if (days < 0 && !c.autoRenew) out.push({ contractId: c.id, kind: "expired", days });
    else if (days >= 0 && days <= withinDays) out.push({ contractId: c.id, kind: "expiring", days });
  }
  return out.sort((a, b) => a.days - b.days);
}

/** Oportunidades abiertas sin cambio de etapa en `days` días. */
export function staleDeals<T extends Pick<Deal, "stage" | "stageChangedAt">>(ds: T[], now: Date, days = 14) {
  return ds.filter((d) => OPEN_STAGES.includes(d.stage) && now.getTime() - d.stageChangedAt.getTime() > days * DAY);
}

// ---------- base de datos ----------
export type AccountInput = Omit<typeof accounts.$inferInsert, "id" | "createdAt" | "updatedAt">;

export async function saveAccount(db: Db, id: string | null, a: AccountInput) {
  if (id) {
    await db.update(accounts).set(a).where(eq(accounts.id, id));
    return id;
  }
  const [row] = await db.insert(accounts).values(a).returning({ id: accounts.id });
  return row.id;
}

const ACCOUNT_TAG = { clinic: "clinic", university: "university", hospital: "hospital", institution: "clinic", other: "lead" } as const;

/** Agrega una persona a la cuenta. El contacto se crea o completa en Contactos de Ziora Ops. */
export async function addAccountContact(
  db: Db, accountId: string,
  p: { name: string; email: string; phone?: string; title?: string; decisionMaker?: boolean },
) {
  const [acc] = await db.select({ type: accounts.type }).from(accounts).where(eq(accounts.id, accountId));
  if (!acc) throw new Error("La cuenta ya no existe.");
  const { id: contactId } = await upsertContact(db, {
    name: p.name, email: p.email, phone: p.phone, source: "manual", tags: [ACCOUNT_TAG[acc.type], "lead"],
  });
  await db.insert(accountContacts)
    .values({ accountId, contactId, title: p.title ?? null, decisionMaker: !!p.decisionMaker })
    .onConflictDoUpdate({ target: [accountContacts.accountId, accountContacts.contactId], set: { title: p.title ?? null, decisionMaker: !!p.decisionMaker } });
  return contactId;
}

export type DealInput = Omit<typeof deals.$inferInsert, "id" | "createdAt" | "updatedAt" | "stageChangedAt">;

export async function saveDeal(db: Db, id: string | null, d: DealInput) {
  if (d.stage === "lost" && !d.lostReason?.trim()) throw new Error("Indica por qué se perdió.");
  if (id) {
    const [cur] = await db.select({ stage: deals.stage }).from(deals).where(eq(deals.id, id));
    if (!cur) throw new Error("La oportunidad ya no existe.");
    await db.update(deals).set({ ...d, ...(cur.stage !== d.stage ? { stageChangedAt: new Date() } : {}) }).where(eq(deals.id, id));
    if (d.stage === "won" && cur.stage !== "won") await draftContractFromDeal(db, id);
    return id;
  }
  const [row] = await db.insert(deals).values(d).returning({ id: deals.id });
  if (d.stage === "won") await draftContractFromDeal(db, row.id);
  return row.id;
}

/** Mover en el tablero. "Perdida" desde el tablero no pide motivo: se captura al abrir la oportunidad. */
export async function moveDeal(db: Db, id: string, stage: DealStage) {
  const [cur] = await db.select({ stage: deals.stage }).from(deals).where(eq(deals.id, id));
  if (!cur || cur.stage === stage) return;
  await db.update(deals).set({ stage, stageChangedAt: new Date() }).where(eq(deals.id, id));
  if (stage === "won") await draftContractFromDeal(db, id);
}

/** Al ganar una oportunidad se crea el borrador del contrato (una sola vez). */
export async function draftContractFromDeal(db: Db, dealId: string) {
  const [existing] = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.dealId, dealId)).limit(1);
  if (existing) return existing.id;
  const [d] = await db.select().from(deals).where(eq(deals.id, dealId));
  const [row] = await db.insert(contracts).values({
    accountId: d.accountId, dealId: d.id, title: d.name, seats: d.seats, amountMxn: d.amountMxn ?? 0,
    pricePerSeatMxn: d.seats && d.amountMxn ? Math.round(d.amountMxn / d.seats) : null,
    billingPeriod: d.billingPeriod, status: "draft",
  }).returning({ id: contracts.id });
  return row.id;
}

export type ContractInput = Omit<typeof contracts.$inferInsert, "id" | "number" | "createdAt" | "updatedAt">;

export async function saveContract(db: Db, _actor: Actor, id: string | null, c: ContractInput) {
  if (c.startsOn && c.endsOn && c.endsOn < c.startsOn) throw new Error("La fecha de fin es anterior al inicio.");
  if (["signed", "active"].includes(c.status ?? "") && !c.startsOn) throw new Error("Un contrato firmado necesita fecha de inicio.");
  // Si no se capturó el monto, se calcula con licencias × precio.
  const amountMxn = c.amountMxn || (c.seats && c.pricePerSeatMxn ? c.seats * c.pricePerSeatMxn : 0);
  const row = { ...c, amountMxn, signedOn: c.signedOn ?? (["signed", "active"].includes(c.status ?? "") ? c.startsOn : null) };
  if (id) {
    await db.update(contracts).set(row).where(eq(contracts.id, id));
    return id;
  }
  const [r] = await db.insert(contracts).values(row).returning({ id: contracts.id });
  return r.id;
}

/** Marca como vencidos los contratos sin renovación automática cuya fecha de fin ya pasó. */
export async function expireContracts(db: Db, today: string) {
  const live = await db.select().from(contracts).where(and(eq(contracts.autoRenew, false)));
  const ids = live.filter((c) => ["signed", "active"].includes(c.status) && c.endsOn && c.endsOn < today).map((c) => c.id);
  for (const id of ids) await db.update(contracts).set({ status: "expired" }).where(eq(contracts.id, id));
  return ids.length;
}
