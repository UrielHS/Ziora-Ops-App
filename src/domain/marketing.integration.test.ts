/** Corre con RUN_DB_TESTS=1 y DATABASE_URL (con PGlite: npm run db:local y DB_POOL_MAX=1). */
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

const enabled = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS === "1";
// Sin base de datos ni siquiera se ejecuta el bloque (sus imports necesitan DATABASE_URL).
const describeDb = (name: string, fn: () => Promise<void>) =>
  enabled ? describe(name, fn) : describe.skip(name, () => it.skip("necesita RUN_DB_TESTS=1 y DATABASE_URL", () => {}));

describeDb("redes y anuncios", async () => {
  const { db } = await import("@/db");
  const { adCampaigns, adDaily, socialAccounts, socialDaily, socialPosts } = await import("@/db/schema");
  const mk = await import("./marketing");
  const { encryptSecret } = await import("@/lib/crypto");
  const { syncAccount } = await import("@/integrations/social");
  const tag = Date.now();
  afterEach(() => vi.unstubAllGlobals());

  it("CSV orgánico: reimportar actualiza sin duplicar y un vacío no borra", async () => {
    const [a] = await db.insert(socialAccounts).values({ platform: "tiktok", handle: `@t${tag}` }).returning();
    await mk.upsertSocialDaily(db, a.id, mk.parseOrganicCsv("Fecha,Seguidores,Alcance\n2026-11-01,100,900\n2026-11-02,110,1000").rows);
    await mk.upsertSocialDaily(db, a.id, mk.parseOrganicCsv("Fecha,Seguidores,Alcance\n2026-11-02,115,").rows);
    const rows = await db.select().from(socialDaily).where(eq(socialDaily.accountId, a.id));
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.day === "2026-11-02")).toMatchObject({ followers: 115, reach: 1000 });
  });

  it("CSV de anuncios: campañas por id o nombre, reimportación idempotente", async () => {
    const [a] = await db.insert(socialAccounts).values({ platform: "linkedin", handle: `@l${tag}` }).returning();
    const csv = `Fecha,Campaña,Gasto,Impresiones,Clics,Leads\n2026-11-01,Clínicas ${tag},500,10000,80,4\n2026-11-02,Clínicas ${tag},450.5,9000,70,3`;
    await mk.upsertAds(db, "linkedin", a.id, mk.parseAdsCsv(csv).rows);
    const r = await mk.upsertAds(db, "linkedin", a.id, mk.parseAdsCsv(csv).rows);
    expect(r).toEqual({ campaigns: 1, rows: 2 });
    const [c] = await db.select().from(adCampaigns).where(eq(adCampaigns.name, `Clínicas ${tag}`));
    const d = await db.select().from(adDaily).where(eq(adDaily.campaignId, c.id));
    expect(mk.sumAds(d)).toEqual({ spendCents: 95050, impressions: 19000, clicks: 150, leads: 7, conversions: 0 });
  });

  it("Meta: sincroniza Instagram y Ads con respuestas de la Graph API", async () => {
    process.env.SOCIAL_TOKEN_KEY = Buffer.alloc(32, 3).toString("base64");
    const [a] = await db.insert(socialAccounts).values({
      platform: "instagram", handle: `@ig${tag}`, externalId: "1789", adAccountId: "555", tokenEncrypted: encryptSecret("tok"),
    }).returning();
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (input: URL | string) => {
      const url = new URL(String(input));
      expect(url.searchParams.get("access_token")).toBe("tok");
      const path = url.pathname.replace(/^\/v[\d.]+\//, "");
      const metric = url.searchParams.get("metric");
      seen.push(`${path}${metric ? `?${metric}` : ""}`);
      const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200 });
      if (path === "1789") return json({ followers_count: 1500 });
      if (path === "1789/insights" && metric === "reach") return json({ data: [{ name: "reach", values: [{ value: 800, end_time: "2026-11-02T06:00:00+0000" }, { value: 950, end_time: "2026-11-03T06:00:00+0000" }] }] });
      if (path === "1789/insights" && metric === "views") return new Response(JSON.stringify({ error: { message: "metric deprecated" } }), { status: 400 });
      if (path === "1789/insights") return json({ data: [{ name: metric, total_value: { value: 7 } }] });
      if (path === "1789/media") return json({ data: [{ id: "m1", caption: "SOAP en 5 láminas", media_type: "CAROUSEL_ALBUM", permalink: "https://instagram.com/p/x", timestamp: "2026-11-01T18:00:00+0000", like_count: 40, comments_count: 3 }] });
      if (path === "m1/insights") return json({ data: [{ name: "reach", values: [{ value: 1200 }] }, { name: "saved", values: [{ value: 25 }] }] });
      if (path === "act_555") return json({ currency: "MXN" });
      if (path === "act_555/campaigns") return json({ data: [{ id: "c1", objective: "OUTCOME_LEADS", effective_status: "ACTIVE" }] });
      if (path === "act_555/insights") return json({ data: [{ campaign_id: "c1", campaign_name: `Demo GDL ${tag}`, spend: "350.25", impressions: "12000", clicks: "140", date_start: "2026-11-02", actions: [{ action_type: "lead", value: "5" }, { action_type: "link_click", value: "140" }] }] });
      return new Response("{}", { status: 404 });
    });

    const r = await syncAccount(db, a, new Date("2026-11-03T18:00:00Z"));
    expect(r.warnings.some((w) => w.includes("views"))).toBe(true); // una métrica retirada no tumba el resto
    const daily = await db.select().from(socialDaily).where(eq(socialDaily.accountId, a.id));
    expect(daily.find((d) => d.day === "2026-11-01")?.reach).toBe(800);
    expect(daily.find((d) => d.day === "2026-11-02")).toMatchObject({ reach: 950, profileViews: 7 });
    expect(daily.find((d) => d.day === "2026-11-03")?.followers).toBe(1500);
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.accountId, a.id));
    expect(post).toMatchObject({ externalId: "m1", reach: 1200, saves: 25, likes: 40 });
    const [camp] = await db.select().from(adCampaigns).where(eq(adCampaigns.externalId, "c1"));
    expect(camp).toMatchObject({ objective: "OUTCOME_LEADS", status: "ACTIVE", platform: "instagram" });
    const [ad] = await db.select().from(adDaily).where(eq(adDaily.campaignId, camp.id));
    expect(ad).toMatchObject({ spendCents: 35025, leads: 5, clicks: 140 });
    const [after] = await db.select().from(socialAccounts).where(eq(socialAccounts.id, a.id));
    expect(after.lastError).toContain("views");
    expect(seen).toContain("1789/insights?profile_views");
  });
});
