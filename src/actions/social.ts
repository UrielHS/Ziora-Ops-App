"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { adCampaigns, socialAccounts, socialPlatformEnum } from "@/db/schema";
import * as mk from "@/domain/marketing";
import { syncAccount } from "@/integrations/social";
import { formAction, type ActionState } from "@/lib/action";
import { encryptSecret } from "@/lib/crypto";
import { requirePermission } from "@/lib/session";

const MAX_CSV = 5 * 1024 * 1024;
const csvFile = z.instanceof(File, { message: "elige un archivo CSV" }).refine((f) => f.size > 0 && f.size <= MAX_CSV, "el CSV debe pesar menos de 5 MB");

const _saveSocialAccount = formAction(
  z.object({
    id: z.uuid().optional(),
    platform: z.enum(socialPlatformEnum.enumValues),
    handle: z.string().trim().min(2).max(80),
    externalId: z.string().trim().max(80).optional(),
    adAccountId: z.string().trim().max(80).optional(),
    token: z.string().trim().max(2000).optional(),
    clearToken: z.literal("on").optional(),
  }),
  async ({ id, token, clearToken, ...a }) => {
    await requirePermission("integrations.manage");
    // El token nunca se devuelve a la pantalla: vacío = conservar el actual.
    const tokenPatch = clearToken ? { tokenEncrypted: null } : token ? { tokenEncrypted: encryptSecret(token) } : {};
    const row = { ...a, externalId: a.externalId ?? null, adAccountId: a.adAccountId ?? null, ...tokenPatch };
    if (id) await db.update(socialAccounts).set(row).where(eq(socialAccounts.id, id));
    else await db.insert(socialAccounts).values(row);
    revalidatePath("/social", "layout");
    return "Cuenta guardada.";
  },
);

const _importOrganic = formAction(
  z.object({ accountId: z.uuid(), file: csvFile }),
  async ({ accountId, file }) => {
    await requirePermission("content.manage");
    const { rows, skipped } = mk.parseOrganicCsv(await file.text());
    if (rows.length === 0) throw new Error("El archivo no tiene filas con fecha válida.");
    await mk.upsertSocialDaily(db, accountId, rows);
    await mk.markSync(db, accountId, null);
    revalidatePath("/social", "layout");
    return `${rows.length} días importados${skipped ? ` (${skipped} filas sin fecha se omitieron)` : ""}.`;
  },
);

const _importAds = formAction(
  z.object({ accountId: z.uuid(), file: csvFile }),
  async ({ accountId, file }) => {
    await requirePermission("content.manage");
    const [acc] = await db.select({ platform: socialAccounts.platform }).from(socialAccounts).where(eq(socialAccounts.id, accountId));
    if (!acc) throw new Error("La cuenta ya no existe.");
    const { rows, skipped } = mk.parseAdsCsv(await file.text());
    if (rows.length === 0) throw new Error("El archivo no tiene filas válidas (fecha, campaña y gasto).");
    const r = await mk.upsertAds(db, acc.platform, accountId, rows);
    revalidatePath("/ads");
    return `${r.rows} filas de ${r.campaigns} campañas importadas${skipped ? ` (${skipped} omitidas)` : ""}.`;
  },
);

const _setCampaignUtm = formAction(
  z.object({ id: z.uuid(), utmCampaign: z.string().trim().max(120).optional() }),
  async ({ id, utmCampaign }) => {
    await requirePermission("content.manage");
    await db.update(adCampaigns).set({ utmCampaign: utmCampaign || null }).where(eq(adCampaigns.id, id));
    revalidatePath("/ads");
    return "UTM guardado.";
  },
);

export async function syncSocialNow(fd: FormData) {
  await requirePermission("integrations.manage");
  const id = z.uuid().parse(fd.get("id"));
  const [a] = await db.select().from(socialAccounts).where(eq(socialAccounts.id, id));
  if (!a) return;
  try {
    await syncAccount(db, a);
  } catch (e) {
    await mk.markSync(db, a.id, e instanceof Error ? e.message : String(e));
  }
  revalidatePath("/social", "layout");
  revalidatePath("/ads");
}

// Next exige que cada export de un archivo "use server" sea una función async declarada.
export async function saveSocialAccount(prev: ActionState, fd: FormData) {
  return _saveSocialAccount(prev, fd);
}
export async function importOrganicCsv(prev: ActionState, fd: FormData) {
  return _importOrganic(prev, fd);
}
export async function importAdsCsv(prev: ActionState, fd: FormData) {
  return _importAds(prev, fd);
}
export async function setCampaignUtm(prev: ActionState, fd: FormData) {
  return _setCampaignUtm(prev, fd);
}
