import { timingSafeEqual } from "node:crypto";

export function isJobAuthorized(req: Request): boolean {
  const secret = process.env.JOB_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
