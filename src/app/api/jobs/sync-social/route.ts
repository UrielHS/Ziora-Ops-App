import { NextResponse } from "next/server";
import { db } from "@/db";
import { syncAllSocial } from "@/integrations/social";
import { isJobAuthorized } from "@/lib/job-auth";

// Cloud Scheduler diario (6:00 CDMX): POST con Authorization: Bearer <JOB_SECRET>
export async function POST(req: Request) {
  if (!isJobAuthorized(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, accounts: await syncAllSocial(db) });
  } catch (e) {
    console.error("sync-social", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
