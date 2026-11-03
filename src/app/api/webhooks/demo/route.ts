import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { ingestDemo } from "@/domain/demos";
import { verifyHmac } from "@/lib/crypto";
import { requireEnv } from "@/lib/env";

/**
 * Entrada alternativa de demos por webhook firmado (HMAC-SHA256 con DEMO_WEBHOOK_SECRET en X-Ziora-Signature).
 * Hoy las demos de ziora-copilot.com/demo se agendan en el Google Calendar del CEO y entran por
 * /api/jobs/sync-demos; este endpoint queda para otras fuentes (p. ej. si el formulario guarda en la BD de Ziora).
 */
const Payload = z.object({
  id: z.string().optional(), // id en el sistema de origen, para no duplicar
  fullName: z.string().min(1).max(200),
  email: z.email(),
  whatsapp: z.string().max(40).optional(),
  patientsPerWeek: z.string().max(40).optional(),
  teletherapy: z.string().max(40).optional(),
  painPoint: z.string().max(300).optional(),
  city: z.string().max(80).optional(),
  scheduledAt: z.iso.datetime().optional(),
  marketingOptIn: z.boolean().optional(), // casilla en el formulario; sin ella NO se agrega a campañas
  utm: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyHmac(requireEnv("DEMO_WEBHOOK_SECRET"), raw, req.headers.get("x-ziora-signature"))) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }
  const parsed = Payload.safeParse(JSON.parse(raw));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const p = parsed.data;

  const r = await ingestDemo(db, {
    externalId: p.id, fullName: p.fullName, email: p.email, whatsapp: p.whatsapp, patientsPerWeek: p.patientsPerWeek,
    teletherapy: p.teletherapy, painPoint: p.painPoint, city: p.city, scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : null,
    marketingOptIn: p.marketingOptIn, utm: p.utm, source: "ziora-copilot.com/demo", raw: JSON.parse(raw),
  });
  return NextResponse.json({ ok: true, ...r });
}
