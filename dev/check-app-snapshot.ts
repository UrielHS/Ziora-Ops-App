/**
 * Revisa el endpoint /ops/snapshot de ziora-api sin guardar nada en la base.
 * Valida la respuesta con el mismo esquema estricto que usa Ziora Ops y prueba que una firma mala dé 401.
 * Solo imprime conteos y errores de formato: ningún correo ni nombre.
 *
 *   ZIORA_APP_BRIDGE_SECRET=... npx tsx dev/check-app-snapshot.ts https://ziora-api-staging-…run.app/ops/snapshot
 */
import { Snapshot } from "../src/domain/app-users";
import { hmacSha256Hex } from "../src/lib/crypto";

const url = process.argv[2];
const secret = process.env.ZIORA_APP_BRIDGE_SECRET;
if (!url || !secret) {
  console.error("Uso: ZIORA_APP_BRIDGE_SECRET=... npx tsx dev/check-app-snapshot.ts <url de /ops/snapshot>");
  process.exit(2);
}

async function call(sign: (body: string) => string) {
  const body = JSON.stringify({ requestedAt: new Date().toISOString() });
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ops-signature": sign(body) },
    body,
    signal: AbortSignal.timeout(60_000),
  });
  return { status: res.status, text: await res.text() };
}

const count = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {}))
  .map(([k, n]) => `${k}: ${n}`).join(", ");

(async () => {
  let failed = false;
  const bad = await call(() => "00".repeat(32));
  console.log(`${bad.status === 401 ? "OK   " : "FALLA"} firma inválida -> ${bad.status} (se espera 401)`);
  failed ||= bad.status !== 401;

  const good = await call((b) => hmacSha256Hex(secret, b));
  console.log(`${good.status === 200 ? "OK   " : "FALLA"} firma válida -> ${good.status} (se espera 200)`);
  if (good.status !== 200) {
    console.log("     respuesta:", good.text.slice(0, 200));
    process.exit(1);
  }

  const parsed = Snapshot.safeParse(JSON.parse(good.text));
  if (!parsed.success) {
    console.log("FALLA formato: Ziora Ops rechazaría la sincronización completa");
    for (const i of parsed.error.issues.slice(0, 10)) console.log(`     ${i.path.join(".")}: ${i.message}`);
    process.exit(1);
  }
  const users = parsed.data.users;
  console.log(`OK    formato: ${users.length} usuarios, generatedAt ${parsed.data.generatedAt}`);
  console.log(`      planes   -> ${count(users.map((u) => u.plan))}`);
  console.log(`      estados  -> ${count(users.map((u) => u.status))}`);
  console.log(`      con MRR  -> ${users.filter((u) => u.mrrAmount != null).length} · con última actividad -> ${users.filter((u) => u.lastActiveAt).length} · pacientes -> ${users.reduce((s, u) => s + u.patientCount, 0)}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error("FALLA", e instanceof Error ? e.message : e);
  process.exit(1);
});
