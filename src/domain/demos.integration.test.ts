/** Corre con RUN_DB_TESTS=1 y DATABASE_URL apuntando a una base con ambos schemas. */
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

const enabled = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS === "1";

describe.runIf(enabled)("demos desde el calendario", () => {
  it("crea, reagenda, cancela y reactiva sin duplicar", async () => {
    const { db } = await import("@/db");
    const { demoRequests } = await import("@/db/schema");
    const { contacts, contactTags } = await import("@/db/schema");
    const { applyCalendarDemo } = await import("./demos");
    const id = `gcal:test-${Date.now()}`;
    const base = { externalId: id, cancelled: false, fullName: "Psic. Calendario Prueba", email: `cal${Date.now()}@example.com`, whatsapp: "+52 33 1111 2222", city: "Guadalajara", scheduledAt: new Date("2026-11-03T17:00:00Z") };

    expect(await applyCalendarDemo(db, base)).toBe("created");
    expect(await applyCalendarDemo(db, base)).toBe("skipped");
    expect(await applyCalendarDemo(db, { ...base, scheduledAt: new Date("2026-11-04T18:00:00Z") })).toBe("rescheduled");
    expect(await applyCalendarDemo(db, { ...base, cancelled: true })).toBe("cancelled");
    let [d] = await db.select().from(demoRequests).where(eq(demoRequests.externalId, id));
    expect(d.stage).toBe("lost");
    expect(await applyCalendarDemo(db, { ...base, scheduledAt: new Date("2026-11-05T18:00:00Z") })).toBe("rescheduled");
    [d] = await db.select().from(demoRequests).where(eq(demoRequests.externalId, id));
    expect(d.stage).toBe("scheduled");

    const [c] = await db.select().from(contacts).where(eq(contacts.email, base.email));
    expect(c.city).toBe("gdl");
    const tags = await db.select().from(contactTags).where(eq(contactTags.contactId, c.id));
    expect(tags.map((t) => t.tag).sort()).toEqual(["lead", "psychologist"]);
    expect((await db.select().from(demoRequests).where(eq(demoRequests.externalId, id))).length).toBe(1);
  });
});

describe.runIf(enabled)("demos que avisa la app", () => {
  it("crea, ignora duplicados, reagenda, cancela y reactiva por id", async () => {
    const { db } = await import("@/db");
    const { demoRequests } = await import("@/db/schema");
    const { applyWebhookDemo } = await import("./demos");
    const id = `app:test-${Date.now()}`;
    const base = { externalId: id, fullName: "Psic. App Prueba", email: `app${Date.now()}@example.com`, source: "ziora-copilot.com/demo", scheduledAt: new Date("2026-11-06T17:00:00Z"), utm: { utm_campaign: "demo-psicologos-gdl" } };

    expect((await applyWebhookDemo(db, base)).result).toBe("created");
    expect((await applyWebhookDemo(db, base)).result).toBe("duplicate");
    expect((await applyWebhookDemo(db, { ...base, status: "rescheduled", scheduledAt: new Date("2026-11-07T18:00:00Z") })).result).toBe("rescheduled");
    expect((await applyWebhookDemo(db, { ...base, status: "cancelled" })).result).toBe("cancelled");
    let [d] = await db.select().from(demoRequests).where(eq(demoRequests.externalId, id));
    expect(d.stage).toBe("lost");
    expect((await applyWebhookDemo(db, { ...base, status: "rescheduled", scheduledAt: new Date("2026-11-08T18:00:00Z") })).result).toBe("rescheduled");
    [d] = await db.select().from(demoRequests).where(eq(demoRequests.externalId, id));
    expect(d.stage).toBe("scheduled");
    expect(d.utm).toEqual({ utm_campaign: "demo-psicologos-gdl" });
    expect((await applyWebhookDemo(db, { ...base, externalId: `${id}-x`, status: "cancelled" })).result).toBe("skipped");
  });
});
