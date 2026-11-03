import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { sendCampaign } from "@/domain/campaigns";
import { isJobAuthorized } from "@/lib/job-auth";

export const maxDuration = 300;

export async function POST(req: Request) {
  if (!isJobAuthorized(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const body = z.object({ campaignId: z.uuid() }).safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues }, { status: 400 });
  const result = await sendCampaign(db, body.data.campaignId);
  return NextResponse.json({ ok: true, ...result });
}
