import { createHmac, timingSafeEqual } from "node:crypto";

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
