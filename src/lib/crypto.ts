import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Compara en tiempo constante. Acepta "sha256=<hex>" (GitHub) o el hex solo. */
export function verifyHmac(secret: string, payload: string, signature: string | null): boolean {
  if (!signature) return false;
  const given = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const expected = hmacSha256Hex(secret, payload);
  const a = Buffer.from(given, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Token de baja sin estado: <contactId>.<hmac>. */
export function unsubscribeToken(secret: string, contactId: string): string {
  return `${contactId}.${hmacSha256Hex(secret, `unsub:${contactId}`).slice(0, 32)}`;
}

export function readUnsubscribeToken(secret: string, token: string): string | null {
  const [contactId, sig] = token.split(".");
  if (!contactId || !sig) return null;
  const expected = unsubscribeToken(secret, contactId).split(".")[1];
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? contactId : null;
}

// ---------- tokens de redes sociales (AES-256-GCM) ----------
// Llave: SOCIAL_TOKEN_KEY = 32 bytes en base64 (openssl rand -base64 32). Formato: v1.<iv>.<tag>.<datos>.
function tokenKey(): Buffer {
  const raw = process.env.SOCIAL_TOKEN_KEY;
  if (!raw) throw new Error("Falta SOCIAL_TOKEN_KEY para guardar tokens de redes sociales.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("SOCIAL_TOKEN_KEY debe ser de 32 bytes en base64.");
  return key;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(".");
}

export function decryptSecret(stored: string): string {
  const [v, iv, tag, data] = stored.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Token guardado con un formato desconocido.");
  const decipher = createDecipheriv("aes-256-gcm", tokenKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
