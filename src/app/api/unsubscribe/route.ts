import { db } from "@/db";
import { optOut } from "@/domain/contacts";
import { readUnsubscribeToken } from "@/lib/crypto";
import { requireEnv } from "@/lib/env";

function page(msg: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ziora</title>
<body style="font-family:system-ui,sans-serif;background:#eaf8f0;color:#1a2520;display:grid;place-items:center;min-height:100vh;margin:0">
<div style="background:#fff;border-radius:24px;padding:40px;max-width:420px;text-align:center"><h1 style="font-size:22px">${msg}</h1>
<p style="color:#4b5563">Si fue un error, escríbenos a hola@ziora-copilot.com.</p></div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

async function handle(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  const contactId = readUnsubscribeToken(requireEnv("UNSUBSCRIBE_SECRET"), t);
  if (!contactId) return page("Enlace no válido", 400);
  await optOut(db, contactId);
  return page("Listo, ya no recibirás estos correos.");
}

export const GET = handle;
export const POST = handle; // one-click (RFC 8058) desde Gmail/Outlook
