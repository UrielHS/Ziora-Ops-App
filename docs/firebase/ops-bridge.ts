/**
 * Puente Ziora Copilot (Firebase) → Ziora Ops. Copiar a functions/src/ops-bridge.ts del repo de la app
 * y exportar desde functions/src/index.ts:
 *
 *   export { opsSnapshot, opsHelpRequest } from "./ops-bridge";
 *
 * Requisitos: firebase-functions v5+ y firebase-admin v12+ (Node 20+).
 * Secreto: firebase functions:secrets:set OPS_BRIDGE_SECRET   (el mismo valor que ZIORA_APP_BRIDGE_SECRET en Ziora Ops)
 *
 * PRIVACIDAD: de los pacientes solo sale un número (count()). No se lee ningún documento de paciente.
 * Ziora Ops rechaza el snapshot completo si aparece un campo fuera del contrato.
 *
 * ⚠️ AJUSTAR las constantes de RUTAS y los campos de mapUser() a cómo guarda los datos la app.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

if (!getApps().length) initializeApp();
const db = getFirestore();
const SECRET = defineSecret("OPS_BRIDGE_SECRET");

// ---------- RUTAS (ajustar) ----------
const USERS = "users"; // users/{uid}: datos del terapeuta
const PATIENTS = (uid: string) => db.collection(USERS).doc(uid).collection("patients"); // o db.collection("patients").where("therapistId", "==", uid)
const SESSIONS = (uid: string) => db.collection(USERS).doc(uid).collection("sessions"); // sesiones con campo createdAt
const HELP = "helpRequests"; // colección de "Ayuda y sugerencias"
const OPS_HELP_WEBHOOK = "https://<url-de-ziora-ops>/api/webhooks/ziora-help";

const toIso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : null);

/** Solo los campos del contrato. Cualquier otro campo hace que Ziora Ops rechace el snapshot. */
function mapUser(uid: string, d: DocumentData) {
  return {
    uid,
    email: String(d.email ?? ""),
    name: d.displayName ?? d.name ?? null,
    plan: String(d.plan ?? d.subscription?.plan ?? "free"),
    status: String(d.subscriptionStatus ?? d.subscription?.status ?? "active"),
    createdAt: toIso(d.createdAt),
    lastActiveAt: toIso(d.lastActiveAt ?? d.lastLoginAt),
    trialEndsAt: toIso(d.trialEndsAt ?? d.subscription?.trialEnd),
  };
}

function sign(body: string) {
  return createHmac("sha256", SECRET.value()).update(body).digest("hex");
}

function validSignature(body: string, given: string | undefined) {
  if (!given) return false;
  const a = Buffer.from(given, "hex");
  const b = Buffer.from(sign(body), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** POST firmado desde Ziora Ops (cada hora). Devuelve un registro por terapeuta con conteos. */
export const opsSnapshot = onRequest({ secrets: [SECRET], region: "us-central1", timeoutSeconds: 300, memory: "512MiB" }, async (req, res) => {
  const raw = req.rawBody?.toString("utf8") ?? "";
  if (req.method !== "POST" || !validSignature(raw, req.header("x-ops-signature"))) {
    res.status(401).json({ error: "no autorizado" });
    return;
  }
  const requestedAt = Date.parse(JSON.parse(raw).requestedAt ?? "");
  if (!requestedAt || Math.abs(Date.now() - requestedAt) > 5 * 60_000) {
    res.status(401).json({ error: "petición vencida" });
    return;
  }

  const since = Timestamp.fromMillis(Date.now() - 30 * 86_400_000);
  const snap = await db.collection(USERS).get();
  const users = [];
  // Conteos en lotes de 20 para no saturar Firestore. Con miles de usuarios conviene
  // guardar patientCount en el documento del usuario (contador mantenido por trigger) y leerlo aquí.
  for (let i = 0; i < snap.docs.length; i += 20) {
    const batch = await Promise.all(snap.docs.slice(i, i + 20).map(async (doc) => {
      const d = doc.data();
      if (!d.email) return null;
      const [patients, sessions] = await Promise.all([
        PATIENTS(doc.id).count().get(),
        SESSIONS(doc.id).where("createdAt", ">=", since).count().get(),
      ]);
      return { ...mapUser(doc.id, d), patientCount: patients.data().count, sessionsLast30d: sessions.data().count };
    }));
    users.push(...batch.filter(Boolean));
  }
  res.json({ generatedAt: new Date().toISOString(), users });
});

/** Cada mensaje nuevo de "Ayuda y sugerencias" se envía a Ziora Ops como ticket. */
export const opsHelpRequest = onDocumentCreated({ document: `${HELP}/{id}`, secrets: [SECRET], region: "us-central1" }, async (event) => {
  const d = event.data?.data();
  if (!d) return;
  // Solo campos permitidos (Ziora Ops rechaza cualquier otro). Nunca adjuntar datos de pacientes.
  const payload = {
    id: event.params.id,
    message: String(d.message ?? d.text ?? "").slice(0, 5000),
    category: d.category ? String(d.category).slice(0, 80) : undefined,
    subject: d.subject ? String(d.subject).slice(0, 200) : undefined,
    email: d.email ? String(d.email) : undefined,
    appVersion: d.appVersion ? String(d.appVersion).slice(0, 40) : undefined,
    pageUrl: typeof d.pageUrl === "string" && d.pageUrl.startsWith("http") ? d.pageUrl : undefined,
    createdAt: toIso(d.createdAt) ?? undefined,
  };
  if (!payload.message) return;
  const body = JSON.stringify(payload);
  const res = await fetch(OPS_HELP_WEBHOOK, { method: "POST", headers: { "content-type": "application/json", "x-ops-signature": sign(body) }, body });
  // Si falla, la función lanza y Firebase reintenta (activar "retry" en el despliegue). Es idempotente por id.
  if (!res.ok) throw new Error(`Ziora Ops respondió ${res.status}: ${await res.text()}`);
  logger.info("ticket creado en Ziora Ops", { id: event.params.id });
});
