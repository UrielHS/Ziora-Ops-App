import { NextResponse } from "next/server";
import { db } from "@/db";
import { syncCalendarDemos } from "@/domain/demos";
import { isJobAuthorized } from "@/lib/job-auth";

// Cloud Scheduler cada 10 min: POST con Authorization: Bearer <JOB_SECRET>
export async function POST(req: Request) {
  if (!isJobAuthorized(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await syncCalendarDemos(db)) });
  } catch (e) {
    console.error("sync-demos", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
