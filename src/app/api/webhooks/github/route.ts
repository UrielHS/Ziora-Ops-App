import { NextResponse } from "next/server";
import { db } from "@/db";
import { upsertPr } from "@/integrations/github";
import { verifyHmac } from "@/lib/crypto";
import { requireEnv } from "@/lib/env";

// Configurar en cada repo: Settings → Webhooks → Payload URL <APP_URL>/api/webhooks/github,
// content type application/json, secreto GITHUB_WEBHOOK_SECRET, eventos: Pull requests y Pull request reviews.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyHmac(requireEnv("GITHUB_WEBHOOK_SECRET"), raw, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }
  const event = req.headers.get("x-github-event");
  const body = JSON.parse(raw);
  if (event === "ping") return NextResponse.json({ ok: true });

  if ((event === "pull_request" || event === "pull_request_review") && body.pull_request) {
    const reviewState =
      event === "pull_request_review"
        ? body.review?.state === "approved"
          ? "approved"
          : body.review?.state === "changes_requested"
            ? "changes_requested"
            : undefined
        : undefined;
    await upsertPr(db, body.repository.full_name, body.pull_request, { reviewState });
  }
  return NextResponse.json({ ok: true });
}
