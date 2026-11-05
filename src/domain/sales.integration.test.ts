/** Corre con RUN_DB_TESTS=1 y DATABASE_URL (con PGlite: npm run db:local y DB_POOL_MAX=1). */
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

const enabled = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS === "1";
// Sin base de datos ni siquiera se ejecuta el bloque (sus imports necesitan DATABASE_URL).
const describeDb = (name: string, fn: () => Promise<void>) =>
  enabled ? describe(name, fn) : describe.skip(name, () => it.skip("necesita RUN_DB_TESTS=1 y DATABASE_URL", () => {}));

describeDb("ventas B2B", async () => {
  const { db } = await import("@/db");
  const { accountContacts, contracts, deals } = await import("@/db/schema");
  const { contactTags, contacts } = await import("@/db/schema");
  const s = await import("./sales");
  const tag = Date.now();

  it("cuenta, contacto compartido, oportunidad ganada y contrato", async () => {
    const accountId = await s.saveAccount(db, null, { name: `Clínica ${tag}`, type: "clinic" });
    const email = `dir${tag}@example.com`;
    const contactId = await s.addAccountContact(db, accountId, { name: "Directora", email, title: "Directora", decisionMaker: true });
    // Otra vez con el mismo correo: no duplica.
    expect(await s.addAccountContact(db, accountId, { name: "Directora", email: email.toUpperCase(), title: "Directora general" })).toBe(contactId);
    const [link] = await db.select().from(accountContacts).where(eq(accountContacts.contactId, contactId));
    expect(link.title).toBe("Directora general");
    const tags = await db.select().from(contactTags).where(eq(contactTags.contactId, contactId));
    expect(tags.map((t) => t.tag).sort()).toEqual(["clinic", "lead"]);
    expect((await db.select().from(contacts).where(eq(contacts.email, email))).length).toBe(1);

    const dealId = await s.saveDeal(db, null, { accountId, name: "10 licencias", stage: "proposal", seats: 10, amountMxn: 9000, billingPeriod: "monthly" });
    await expect(s.saveDeal(db, dealId, { accountId, name: "10 licencias", stage: "lost" })).rejects.toThrow(/por qué/);

    await s.moveDeal(db, dealId, "won");
    await s.moveDeal(db, dealId, "won");
    const cs = await db.select().from(contracts).where(eq(contracts.dealId, dealId));
    expect(cs).toHaveLength(1);
    expect(cs[0]).toMatchObject({ status: "draft", seats: 10, amountMxn: 9000, pricePerSeatMxn: 900 });
    const [d] = await db.select().from(deals).where(eq(deals.id, dealId));
    expect(d.stage).toBe("won");

    await expect(s.saveContract(db, { id: "x", name: "x" }, cs[0].id, { accountId, title: "x", status: "signed", billingPeriod: "monthly" })).rejects.toThrow(/fecha de inicio/);
    await s.saveContract(db, { id: "x", name: "x" }, cs[0].id, {
      accountId, title: "Contrato", status: "active", billingPeriod: "monthly", seats: 10, pricePerSeatMxn: 950, amountMxn: 0,
      startsOn: "2026-01-01", endsOn: "2026-10-31",
    });
    const [c] = await db.select().from(contracts).where(eq(contracts.id, cs[0].id));
    expect(c.amountMxn).toBe(9500);
    expect(c.signedOn).toBe("2026-01-01");

    expect(await s.expireContracts(db, "2026-11-03")).toBeGreaterThanOrEqual(1);
    const [after] = await db.select().from(contracts).where(eq(contracts.id, cs[0].id));
    expect(after.status).toBe("expired");
  });
});
