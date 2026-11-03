import { timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { bugs } from "@/db/schema";
import { requireEnv } from "@/lib/env";

/**
 * Entrada de bugs desde la app de Ziora (botón "Reportar un problema") o desde Sentry.
 * Header: Authorization: Bearer <BUG_INTAKE_KEY>. No enviar datos clínicos ni de pacientes.
 */
const Payload = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  stepsToReproduce: z.string().max(5000).optional(),
  expected: z.string().max(2000).optional(),
  actual: z.string().max(2000).optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  area: z.string().max(80).optional(),
  environment: z.string().max(40).default("production"),
  device: z.string().max(200).optional(),
  appVersion: z.string().max(40).optional(),
  pageUrl: z.url().optional(),
  reporterEmail: z.email().optional(),
  source: z.enum(["ziora_app", "sentry", "github", "manual"]).default("ziora_app"),
  externalId: z.string().max(200).optional(),
  externalUrl: z.url().optional(),
});

function authorized(req: Request) {
  const given = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const key = Buffer.from(requireEnv("BUG_INTAKE_KEY"));
  return given.length === key.length && timingSafeEqual(given, key);
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const parsed = Payload.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  const p = parsed.data;

  // Si ya existe (mismo origen + id externo), solo suma la ocurrencia.
  const [row] = await db
    .insert(bugs)
    .values(p)
    .onConflictDoNothing()
    .returning({ id: bugs.id, number: bugs.number });
  if (!row && p.externalId) {
    await db
      .update(bugs)
      .set({ occurrences: sql`${bugs.occurrences} + 1` })
      .where(and(eq(bugs.source, p.source), eq(bugs.externalId, p.externalId)));
  }
  return NextResponse.json({ ok: true, bug: row ? `BUG-${row.number}` : "duplicado" });
}
