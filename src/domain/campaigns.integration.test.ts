/**
 * Integración contra una base real con las migraciones de Event Ops + Ziora Ops aplicadas.
 * Corre solo con DATABASE_URL definida: DATABASE_URL=... npx vitest run campaigns.integration
 */
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

const enabled = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS === "1";

describe.runIf(enabled)("campañas: destinatarios", () => {
  it("solo incluye contactos con opt-in vigente y respeta la baja", async () => {
    const { db } = await import("@/db");
    const { campaigns, emailTemplates } = await import("@/db/schema");
    const { contacts } = await import("@/db/shared");
    const { resolveRecipients } = await import("./campaigns");
    const { optOut, upsertSharedContact } = await import("./contacts");

    const suffix = Date.now();
    const optedIn = await upsertSharedContact(db, {
      name: "Psic. Con Permiso", email: `si-${suffix}@test.mx`, city: "mty", source: "demo_form",
      tags: ["psychologist"], marketingOptIn: { source: "test" },
    });
    await upsertSharedContact(db, {
      name: "Psic. Sin Permiso", email: `no-${suffix}@test.mx`, city: "mty", source: "demo_form", tags: ["psychologist"],
    });

    const [tpl] = await db.insert(emailTemplates).values({ name: "t", subject: "Hola {{nombre}}", html: "<p>{{nombre}}</p>" }).returning();
    const [camp] = await db
      .insert(campaigns)
      .values({ name: "c", templateId: tpl.id, segment: { tags: ["psychologist"], cities: ["mty"] } })
      .returning();

    const first = await resolveRecipients(db, camp.id);
    expect(first.map((r) => r.id)).toContain(optedIn);
    expect(first.find((r) => r.email === `no-${suffix}@test.mx`)).toBeUndefined();

    await optOut(db, optedIn);
    const second = await resolveRecipients(db, camp.id);
    expect(second.map((r) => r.id)).not.toContain(optedIn);

    // Re-enviar el formulario con opt-in NO revive una baja
    await upsertSharedContact(db, {
      name: "Psic. Con Permiso", email: `si-${suffix}@test.mx`, source: "demo_form", tags: [], marketingOptIn: { source: "test" },
    });
    const third = await resolveRecipients(db, camp.id);
    expect(third.map((r) => r.id)).not.toContain(optedIn);

    const [c] = await db.select({ city: contacts.city }).from(contacts).where(eq(contacts.id, optedIn));
    expect(c.city).toBe("mty");
  });
});
