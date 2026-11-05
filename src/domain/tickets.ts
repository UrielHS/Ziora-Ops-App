/**
 * Tickets en formato historia de usuario.
 * Ciclo: new → evaluating → planned (crea la tarea) → in_progress → done, o rejected.
 */
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { epics, tasks, tickets } from "@/db/schema";
import { users } from "@/db/shared";
import type { Actor, Notice } from "./content";

type Ticket = typeof tickets.$inferSelect;
export type Effort = NonNullable<Ticket["effort"]>;
export type TicketStatus = Ticket["status"];

const EFFORT_WEIGHT: Record<Effort, number> = { s: 1, m: 2, l: 3, xl: 5 };

/** Impacto entre esfuerzo: lo más valioso y barato primero. Sin evaluar = 0. */
export function priorityScore(impact: number | null, effort: Effort | null) {
  if (!impact || !effort) return 0;
  return Math.round((impact / EFFORT_WEIGHT[effort]) * 100) / 100;
}

export function taskPriority(score: number): "urgent" | "high" | "medium" | "low" {
  if (score >= 4) return "urgent";
  if (score >= 2) return "high";
  if (score >= 1) return "medium";
  return "low";
}

type Story = Pick<Ticket, "asA" | "iWant" | "soThat" | "acceptanceCriteria">;

export function storyComplete(t: Story) {
  return !!(t.asA?.trim() && t.iWant?.trim() && t.soThat?.trim() && t.acceptanceCriteria.some((c) => c.trim()));
}

export function userStoryText(t: Story) {
  const story = `Como ${t.asA?.trim() || "…"}, quiero ${t.iWant?.trim() || "…"}, para ${t.soThat?.trim() || "…"}.`;
  const criteria = t.acceptanceCriteria.filter((c) => c.trim());
  return criteria.length ? `${story}\n\nSabremos que está listo cuando:\n${criteria.map((c) => `- ${c.trim()}`).join("\n")}` : story;
}

/** Separa el texto del formulario en criterios: uno por línea, sin viñetas. */
export function parseCriteria(text: string | undefined | null) {
  return (text ?? "").split("\n").map((l) => l.replace(/^\s*[-*•\d.)]+\s*/, "").trim()).filter(Boolean);
}

export type NewTicket = {
  kind: Ticket["kind"]; title: string; asA?: string; iWant?: string; soThat?: string;
  acceptanceCriteria: string[]; context?: string; area?: string;
};

export async function createTicket(db: Db, actor: Actor, t: NewTicket) {
  const [row] = await db.insert(tickets).values({ ...t, origin: "team", reporterId: actor.id }).returning({ id: tickets.id, number: tickets.number });
  return row;
}

export type HelpRequest = {
  externalId: string; message: string; category?: string; subject?: string;
  reporterEmail?: string; appVersion?: string; pageUrl?: string; createdAt?: string;
};

/** Mensaje de "Ayuda y sugerencias" de la app. Idempotente por externalId. */
export async function ingestHelpRequest(db: Db, h: HelpRequest) {
  const kind: Ticket["kind"] = /error|falla|bug|problema/i.test(h.category ?? "") ? "bug" : /idea|sugerencia|suggestion|feature|mejora/i.test(h.category ?? "") ? "feature" : "change";
  const title = (h.subject?.trim() || h.message.trim().split("\n")[0]).slice(0, 140);
  const [row] = await db
    .insert(tickets)
    .values({
      kind, origin: "ziora_app_help", title, context: h.message, category: h.category ?? null,
      reporterEmail: h.reporterEmail ?? null, externalId: h.externalId, appVersion: h.appVersion ?? null, pageUrl: h.pageUrl ?? null,
      ...(h.createdAt ? { createdAt: new Date(h.createdAt) } : {}),
    })
    .onConflictDoNothing()
    .returning({ number: tickets.number });
  return row ? { created: true as const, number: row.number } : { created: false as const };
}

export type Evaluation = {
  id: string; title: string; kind: Ticket["kind"];
  asA?: string; iWant?: string; soThat?: string; acceptanceCriteria: string[];
  area?: string; impact?: number; effort?: Effort; viability: Ticket["viability"];
  decisionNote?: string; assigneeId?: string; status: TicketStatus; bugId?: string;
};

/** Evaluación de Dev/QA. Planear exige historia completa y viabilidad; rechazar exige motivo. */
export async function evaluateTicket(db: Db, actor: Actor, e: Evaluation) {
  const [t] = await db.select().from(tickets).where(eq(tickets.id, e.id)).limit(1);
  if (!t) throw new Error("El ticket ya no existe.");
  const story = { asA: e.asA ?? null, iWant: e.iWant ?? null, soThat: e.soThat ?? null, acceptanceCriteria: e.acceptanceCriteria };
  const note = e.decisionNote?.trim() || null;

  if (["planned", "in_progress", "done"].includes(e.status) && !t.taskId) {
    if (!storyComplete(story)) throw new Error("Para planear, completa la historia (Como / quiero / para) y al menos un criterio de aceptación.");
    if (e.viability !== "viable") throw new Error("Para planear, marca el ticket como viable.");
    if (!e.impact || !e.effort) throw new Error("Para planear, indica impacto y esfuerzo.");
  }
  if (e.status === "rejected" && !note) throw new Error("Explica por qué no se hará: quien lo pidió lo verá.");
  if (e.viability === "not_viable" && !["rejected", "evaluating", "new"].includes(e.status)) {
    throw new Error("Un ticket no viable no se puede planear. Recházalo o cambia la viabilidad.");
  }

  const score = priorityScore(e.impact ?? null, e.effort ?? null);
  let taskId = t.taskId;
  await db.transaction(async (tx) => {
    if (!taskId && ["planned", "in_progress", "done"].includes(e.status)) {
      const [prod] = await tx.select({ id: epics.id }).from(epics).where(eq(epics.key, "PROD")).limit(1);
      const [task] = await tx.insert(tasks).values({
        title: `TKT-${t.number} · ${e.title}`,
        description: [userStoryText(story), t.context ? `Contexto original:\n${t.context}` : null].filter(Boolean).join("\n\n"),
        status: e.status === "done" ? "done" : e.status === "in_progress" ? "in_progress" : "todo",
        priority: taskPriority(score), epicId: prod?.id ?? null,
        assigneeId: e.assigneeId ?? null, reporterId: t.reporterId ?? actor.id,
        labels: ["ticket", e.kind], bugId: e.bugId ?? t.bugId ?? null,
      }).returning({ id: tasks.id });
      taskId = task.id;
    }
    await tx.update(tickets).set({
      title: e.title, kind: e.kind, ...story, area: e.area ?? null, impact: e.impact ?? null, effort: e.effort ?? null,
      viability: e.viability, decisionNote: note, assigneeId: e.assigneeId ?? null, status: e.status,
      bugId: e.bugId ?? t.bugId, taskId,
    }).where(eq(tickets.id, t.id));
  });

  const notices: Notice[] = [];
  const reporter = t.reporterId ? (await db.select({ email: users.email }).from(users).where(eq(users.id, t.reporterId)))[0]?.email : null;
  if (reporter && t.reporterId !== actor.id && e.status !== t.status) {
    const label = `TKT-${t.number} · ${e.title}`;
    if (e.status === "planned") notices.push({ to: [reporter], subject: `Se hará: ${label}`, lines: ["Tu ticket se evaluó como viable y ya está planeado.", ...(note ? [note] : [])], link: { href: `/tickets?id=${t.id}`, label: "Ver ticket" } });
    if (e.status === "done") notices.push({ to: [reporter], subject: `Listo: ${label}`, lines: ["El cambio que pediste ya está listo. Revísalo y avísanos si algo no quedó como esperabas."], link: { href: `/tickets?id=${t.id}`, label: "Ver ticket" } });
    if (e.status === "rejected") notices.push({ to: [reporter], subject: `No se hará por ahora: ${label}`, lines: [note!], link: { href: `/tickets?id=${t.id}`, label: "Ver ticket" } });
  }
  if (reporter && t.reporterId !== actor.id && e.viability === "needs_info" && t.viability !== "needs_info") {
    notices.push({ to: [reporter], subject: `Necesitamos más información: TKT-${t.number}`, lines: [note ?? "Dev/QA necesita más detalle para evaluar tu ticket."], link: { href: `/tickets?id=${t.id}`, label: "Responder" } });
  }
  return { taskId, score, notices };
}

/** Quien levantó el ticket puede completar la información que le pidieron. */
export async function addTicketInfo(db: Db, actor: Actor, id: string, info: string) {
  const [t] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  if (!t) throw new Error("El ticket ya no existe.");
  const stamp = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "America/Mexico_City" }).format(new Date());
  await db.update(tickets).set({
    context: [t.context, `— ${actor.name}, ${stamp}:\n${info.trim()}`].filter(Boolean).join("\n\n"),
    viability: t.viability === "needs_info" ? "pending" : t.viability,
  }).where(eq(tickets.id, id));
}
