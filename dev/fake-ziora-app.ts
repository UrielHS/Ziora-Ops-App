/**
 * Imita la Cloud Function opsSnapshot para probar la sincronización sin Firebase.
 *
 *   ZIORA_APP_BRIDGE_SECRET=local npx tsx dev/fake-ziora-app.ts     # http://localhost:5055/opsSnapshot
 *
 * En Ziora Ops: ZIORA_APP_SNAPSHOT_URL=http://localhost:5055/opsSnapshot y el mismo secreto.
 * Datos ficticios (@example.com).
 */
import { createServer } from "node:http";
import { hmacSha256Hex, verifyHmac } from "../src/lib/crypto";

const secret = process.env.ZIORA_APP_BRIDGE_SECRET ?? "local";
const DAY = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * DAY).toISOString();
const plans = ["free", "pro", "pro", "pro_anual", "clinic"];
const statuses = ["active", "active", "active", "trialing", "cancelled"];
const users = Array.from({ length: 40 }, (_, i) => ({
  uid: `fake-${i}`,
  email: `terapeuta${i}@example.com`,
  name: `Psic. Ficticia ${i}`,
  plan: plans[i % plans.length],
  status: statuses[(i * 3) % statuses.length],
  createdAt: ago(120 - i * 2),
  lastActiveAt: ago((i * 7) % 30),
  trialEndsAt: statuses[(i * 3) % statuses.length] === "trialing" ? new Date(Date.now() + ((i % 6) + 1) * DAY).toISOString() : null,
  patientCount: (i * 7) % 45,
  sessionsLast30d: (i * 11) % 80,
}));

createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (req.url !== "/opsSnapshot" || !verifyHmac(secret, body, req.headers["x-ops-signature"] as string)) {
      res.writeHead(401).end(JSON.stringify({ error: "no autorizado" }));
      return;
    }
    const out = JSON.stringify({ generatedAt: new Date().toISOString(), users });
    res.writeHead(200, { "content-type": "application/json", "x-ops-signature": hmacSha256Hex(secret, out) }).end(out);
  });
}).listen(5055, () => console.log("opsSnapshot falso en http://localhost:5055/opsSnapshot"));
