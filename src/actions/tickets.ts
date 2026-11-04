"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { effortEnum, ticketKindEnum, tickets, ticketStatusEnum, viabilityEnum } from "@/db/schema";
import * as t from "@/domain/tickets";
import { notifyTeam } from "@/integrations/notify";
import { formAction, type ActionState } from "@/lib/action";
import { can } from "@/lib/permissions";
import { requireAccess, requirePermission } from "@/lib/session";

const story = {
  title: z.string().trim().min(3, "escribe un título corto").max(160),
  kind: z.enum(ticketKindEnum.enumValues),
  asA: z.string().trim().max(200).optional(),
  iWant: z.string().trim().max(1000).optional(),
  soThat: z.string().trim().max(1000).optional(),
  criteria: z.string().max(3000).optional(),
  area: z.string().trim().max(80).optional(),
};

const _createTicket = formAction(
  z.object({ ...story, context: z.string().trim().max(5000).optional() }),
  async (d) => {
    const { user } = await requirePermission("tickets.create");
    if (!d.iWant) throw new Error("Cuéntanos qué necesitas en \"quiero…\".");
    const row = await t.createTicket(db, user, {
      kind: d.kind, title: d.title, asA: d.asA, iWant: d.iWant, soThat: d.soThat,
      acceptanceCriteria: t.parseCriteria(d.criteria), context: d.context, area: d.area,
    });
    revalidatePath("/", "layout");
    return `TKT-${row.number} creado. Dev/QA lo evaluará.`;
  },
);

const _evaluateTicket = formAction(
  z.object({
    ...story,
    id: z.uuid(),
    impact: z.coerce.number().int().min(1).max(5).optional(),
    effort: z.enum(effortEnum.enumValues).optional(),
    viability: z.enum(viabilityEnum.enumValues),
    decisionNote: z.string().trim().max(2000).optional(),
    assigneeId: z.uuid().optional(),
    status: z.enum(ticketStatusEnum.enumValues),
    bugId: z.uuid().optional(),
  }),
  async ({ criteria, ...d }) => {
    const { user } = await requirePermission("tickets.triage");
    const r = await t.evaluateTicket(db, user, { ...d, acceptanceCriteria: t.parseCriteria(criteria) });
    for (const n of r.notices) await notifyTeam(n.to, n.subject, n.lines, n.link);
    revalidatePath("/", "layout");
    return "Evaluación guardada.";
  },
);

const _addTicketInfo = formAction(
  z.object({ id: z.uuid(), info: z.string().trim().min(3).max(3000) }),
  async ({ id, info }) => {
    const access = await requireAccess();
    const [row] = await db.select({ reporterId: tickets.reporterId }).from(tickets).where(eq(tickets.id, id));
    if (row?.reporterId !== access.user.id && !can(access, "tickets.triage")) throw new Error("Solo quien levantó el ticket o Dev/QA pueden agregar información.");
    await t.addTicketInfo(db, access.user, id, info);
    revalidatePath("/tickets");
    return "Información agregada.";
  },
);

// Next exige que cada export de un archivo "use server" sea una función async declarada.
export async function createTicket(prev: ActionState, fd: FormData) {
  return _createTicket(prev, fd);
}
export async function evaluateTicket(prev: ActionState, fd: FormData) {
  return _evaluateTicket(prev, fd);
}
export async function addTicketInfo(prev: ActionState, fd: FormData) {
  return _addTicketInfo(prev, fd);
}
