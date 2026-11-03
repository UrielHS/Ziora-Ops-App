"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { contentChannelEnum, contentPieces, contentPillarEnum, contentStatusEnum, riskEnum } from "@/db/schema";
import { formAction, type ActionState } from "@/lib/action";
import { LEGAL_CHECKLIST } from "@/lib/labels";
import { requireUser } from "@/lib/session";

const fields = z.object({
  title: z.string().trim().min(3).max(200),
  pillar: z.enum(contentPillarEnum.enumValues),
  channel: z.enum(contentChannelEnum.enumValues),
  format: z.string().trim().min(2).max(40),
  status: z.enum(contentStatusEnum.enumValues).default("idea"),
  risk: z.enum(riskEnum.enumValues).default("low"),
  publishOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ownerId: z.uuid().optional(),
  copy: z.string().max(5000).optional(),
  sources: z.string().max(2000).optional(),
  publishedUrl: z.url().optional(),
  checks: z.array(z.string()).default([]),
});

const NEEDS_CHECK = new Set(["approved", "scheduled", "published"]);

async function save(id: string | null, d: z.infer<typeof fields>) {
  const user = await requireUser();
  const legalOk = d.checks.length === LEGAL_CHECKLIST.length;
  if (NEEDS_CHECK.has(d.status) && !legalOk) {
    throw new Error("Para aprobar, programar o publicar hay que completar toda la checklist legal (sección 5 del brief).");
  }
  if (NEEDS_CHECK.has(d.status) && d.risk !== "low" && user.role !== "admin") {
    throw new Error("Las piezas de riesgo medio o alto las aprueba Chris (con Rafa para lo clínico).");
  }
  const row = {
    title: d.title, pillar: d.pillar, channel: d.channel, format: d.format, status: d.status, risk: d.risk,
    publishOn: d.publishOn ?? null, ownerId: d.ownerId ?? null, copy: d.copy ?? null, publishedUrl: d.publishedUrl ?? null,
    sources: d.sources ? d.sources.split("\n").map((s) => s.trim()).filter(Boolean) : [],
    legalChecklistOk: legalOk,
    ...(NEEDS_CHECK.has(d.status) ? { approvedBy: user.id } : {}),
  };
  if (id) await db.update(contentPieces).set(row).where(eq(contentPieces.id, id));
  else await db.insert(contentPieces).values(row);
  revalidatePath("/", "layout");
}

const _createPiece = formAction(fields, (d) => save(null, d));
const _updatePiece = formAction(fields.extend({ id: z.uuid() }), ({ id, ...d }) => save(id, d));

// Next exige que cada export de un archivo "use server" sea una función async declarada.
export async function createPiece(prev: ActionState, fd: FormData) {
  return _createPiece(prev, fd);
}
export async function updatePiece(prev: ActionState, fd: FormData) {
  return _updatePiece(prev, fd);
}
