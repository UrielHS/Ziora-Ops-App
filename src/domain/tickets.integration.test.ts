/** Corre con RUN_DB_TESTS=1 y DATABASE_URL (con PGlite: npm run db:local y DB_POOL_MAX=1). */
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

const enabled = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS === "1";

describe.runIf(enabled)("tickets", async () => {
  const { db } = await import("@/db");
  const { tasks, tickets } = await import("@/db/schema");
  const { users } = await import("@/db/shared");
  const t = await import("./tickets");

  const tag = Date.now();
  let rafa: { id: string; name: string }, uriel: { id: string; name: string };
  beforeAll(async () => {
    const [r] = await db.insert(users).values({ email: `rafa.t${tag}@example.com`, name: "Rafa", role: "operator", active: true }).returning();
    const [u] = await db.insert(users).values({ email: `uriel.t${tag}@example.com`, name: "Uriel", role: "admin", active: true }).returning();
    rafa = { id: r.id, name: r.name };
    uriel = { id: u.id, name: u.name };
  });

  it("del ticket del equipo a la tarea planeada", async () => {
    const { id, number } = await t.createTicket(db, rafa, {
      kind: "change", title: `Notas pendientes ${tag}`, asA: "director de una clínica", iWant: "ver notas pendientes por terapeuta", acceptanceCriteria: [],
    });
    const base = { id, title: `Notas pendientes ${tag}`, kind: "change" as const, asA: "director de una clínica", iWant: "ver notas pendientes por terapeuta" };

    // Falta "para", criterios, viabilidad e impacto/esfuerzo.
    await expect(t.evaluateTicket(db, uriel, { ...base, acceptanceCriteria: [], viability: "viable", status: "planned" })).rejects.toThrow(/completa la historia/);

    // Pedir información avisa a quien lo levantó.
    const info = await t.evaluateTicket(db, uriel, { ...base, acceptanceCriteria: [], viability: "needs_info", status: "evaluating", decisionNote: "¿Para qué tamaño de clínica?" });
    expect(info.notices.map((n) => n.subject)).toEqual([`Necesitamos más información: TKT-${number}`]);
    await t.addTicketInfo(db, rafa, id, "Clínicas de 3 a 10 terapeutas");
    let [row] = await db.select().from(tickets).where(eq(tickets.id, id));
    expect(row.viability).toBe("pending");
    expect(row.context).toContain("Clínicas de 3 a 10 terapeutas");

    const full = { ...base, soThat: "dar seguimiento antes del cierre", acceptanceCriteria: ["Veo un contador por terapeuta"], impact: 4, effort: "m" as const, viability: "viable" as const };
    const planned = await t.evaluateTicket(db, uriel, { ...full, status: "planned", assigneeId: uriel.id });
    expect(planned.score).toBe(2);
    expect(planned.notices[0].subject).toBe(`Se hará: TKT-${number} · Notas pendientes ${tag}`);
    const [task] = await db.select().from(tasks).where(eq(tasks.id, planned.taskId!));
    expect(task.title).toBe(`TKT-${number} · Notas pendientes ${tag}`);
    expect(task.priority).toBe("high");
    expect(task.description).toContain("Sabremos que está listo cuando:\n- Veo un contador por terapeuta");

    // Volver a guardar no duplica la tarea.
    const again = await t.evaluateTicket(db, uriel, { ...full, status: "in_progress" });
    expect(again.taskId).toBe(planned.taskId);
    [row] = await db.select().from(tickets).where(eq(tickets.id, id));
    expect(row.status).toBe("in_progress");
  });

  it("rechazar exige nota", async () => {
    const { id } = await t.createTicket(db, rafa, { kind: "feature", title: `Idea ${tag}`, iWant: "algo", acceptanceCriteria: [] });
    const e = { id, title: `Idea ${tag}`, kind: "feature" as const, acceptanceCriteria: [], viability: "not_viable" as const };
    await expect(t.evaluateTicket(db, uriel, { ...e, status: "rejected" })).rejects.toThrow(/por qué/);
    await expect(t.evaluateTicket(db, uriel, { ...e, status: "planned", decisionNote: "x" })).rejects.toThrow();
    const r = await t.evaluateTicket(db, uriel, { ...e, status: "rejected", decisionNote: "Choca con la NOM-004" });
    expect(r.notices[0].lines).toEqual(["Choca con la NOM-004"]);
  });

  it("mensajes de la app: idempotentes y clasificados", async () => {
    const h = { externalId: `help-${tag}`, message: "No puedo descargar el PDF de la nota\nDesde ayer", category: "Reportar un problema", reporterEmail: "psic@example.com" };
    const a = await t.ingestHelpRequest(db, h);
    expect(a.created).toBe(true);
    expect((await t.ingestHelpRequest(db, h)).created).toBe(false);
    const [row] = await db.select().from(tickets).where(eq(tickets.externalId, h.externalId));
    expect(row.kind).toBe("bug");
    expect(row.origin).toBe("ziora_app_help");
    expect(row.title).toBe("No puedo descargar el PDF de la nota");
  });
});
