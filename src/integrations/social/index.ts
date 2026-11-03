import { isNotNull } from "drizzle-orm";
import type { Db } from "@/db";
import { socialAccounts } from "@/db/schema";
import { markSync, upsertAds, upsertPosts, upsertSocialDaily } from "@/domain/marketing";
import { decryptSecret } from "@/lib/crypto";
import { syncFacebookPage, syncInstagram, syncMetaAds, type MetaSync } from "./meta";

type Account = typeof socialAccounts.$inferSelect;
const DAY = 86_400_000;
const mxDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(d);

/** Últimos `back` días cerrados más hoy. Las plataformas ajustan cifras de días recientes, por eso se re-leen. */
export function syncWindow(now = new Date(), back = 3) {
  return Array.from({ length: back + 1 }, (_, i) => mxDay(new Date(now.getTime() - (back - i) * DAY)));
}

/** TikTok y LinkedIn aún sin conector de API: sus datos entran por importación CSV. */
export async function syncAccount(db: Db, a: Account, now = new Date()) {
  if (!a.tokenEncrypted) throw new Error("La cuenta no tiene token. Conéctala en Redes → Cuentas o usa la importación CSV.");
  if (a.platform === "tiktok" || a.platform === "linkedin") throw new Error("Todavía no hay conector de API para esta red; importa el CSV.");
  const token = decryptSecret(a.tokenEncrypted);
  const days = syncWindow(now);
  const today = days[days.length - 1];
  const results: MetaSync[] = [];
  if (a.externalId) results.push(a.platform === "instagram" ? await syncInstagram(a.externalId, token, days, today) : await syncFacebookPage(a.externalId, token, days, today));
  if (a.adAccountId) results.push(await syncMetaAds(a.adAccountId, token, days[0], today));

  let daily = 0, posts = 0, ads = 0;
  for (const r of results) {
    daily += await upsertSocialDaily(db, a.id, r.daily);
    posts += await upsertPosts(db, a.id, r.posts);
    ads += (await upsertAds(db, a.platform, a.id, r.ads, r.campaignMeta)).rows;
  }
  const warnings = results.flatMap((r) => r.warnings);
  await markSync(db, a.id, warnings.length ? warnings.join(" · ").slice(0, 1000) : null);
  return { daily, posts, ads, warnings };
}

export async function syncAllSocial(db: Db, now = new Date()) {
  const accounts = await db.select().from(socialAccounts).where(isNotNull(socialAccounts.tokenEncrypted));
  const out: Record<string, unknown> = {};
  for (const a of accounts) {
    try {
      out[`${a.platform}:${a.handle}`] = await syncAccount(db, a, now);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await markSync(db, a.id, msg);
      out[`${a.platform}:${a.handle}`] = { error: msg };
    }
  }
  return out;
}
