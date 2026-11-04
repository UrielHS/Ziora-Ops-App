import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { ingestHelpRequest } from "@/domain/tickets";
import { verifyHmac } from "@/lib/crypto";
import { requireEnv } from "@/lib/env";

/**
 * Mensajes de "Ayuda y sugerencias" de app.ziora-copilot.com. Los envía la Cloud Function
 * `opsHelpRequest` al crearse el documento en Firestore. Firma: X-Ops-Signature (HMAC-SHA256 del cuerpo
 * con ZIORA_APP_BRIDGE_SECRET). Campos cerrados: nada de pacientes.
 */
const Payload = z.strictObject({
  id: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  category: z.string().max(80).optional(),
  subject: z.string().max(200).optional(),
  email: z.email().optional(),
  appVersion: z.string().max(40).optional(),
  pageUrl: z.url().optional(),
  createdAt: z.iso.datetime({ offset: true }).optional(),
});

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyHmac(requireEnv("ZIORA_APP_BRIDGE_SECRET"), raw, req.headers.get("x-ops-signature"))) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = Payload.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const p = parsed.data;
  const r = await ingestHelpRequest(db, {
    externalId: p.id, message: p.message, category: p.category, subject: p.subject,
    reporterEmail: p.email, appVersion: p.appVersion, pageUrl: p.pageUrl, createdAt: p.createdAt,
  });
  return NextResponse.json({ ok: true, ticket: r.created ? `TKT-${r.number}` : "duplicado" });
}
