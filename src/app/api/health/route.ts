import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

export const dynamic = "force-dynamic";

// Verifica la conexión y que existan ambos lados: public.contacts (Event Ops) y ops.tasks (Ziora Ops).
export async function GET() {
  try {
    // Público (lo usa el smoke test): no devuelve conteos ni datos.
    await db.execute(sql`select 1 from public.contacts limit 1`); // falla si no hay permiso sobre lo compartido
    const [r] = await db.execute<{ ops: boolean }>(sql`select to_regclass('ops.tasks') is not null as ops`);
    return NextResponse.json({ ok: r.ops }, { status: r.ops ? 200 : 500 });
  } catch (err) {
    console.error("health", err);
    // En desarrollo muestra la causa real (conexión rechazada, tabla inexistente…); en producción no expone nada.
    const e = err as { message?: string; cause?: { message?: string; code?: string } };
    const detail = process.env.NODE_ENV === "production" ? undefined : { message: e.message?.split("\n")[0], cause: e.cause?.message, code: e.cause?.code };
    return NextResponse.json({ ok: false, detail }, { status: 500 });
  }
}
