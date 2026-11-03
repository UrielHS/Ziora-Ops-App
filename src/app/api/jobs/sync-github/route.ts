import { NextResponse } from "next/server";
import { db } from "@/db";
import { syncOpenPullRequests } from "@/integrations/github";
import { isJobAuthorized } from "@/lib/job-auth";

// Cloud Scheduler cada 30 min: POST con Authorization: Bearer <JOB_SECRET>
export async function POST(req: Request) {
  if (!isJobAuthorized(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const synced = await syncOpenPullRequests(db);
  return NextResponse.json({ ok: true, synced });
}
