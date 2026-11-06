import { timingSafeEqual } from "node:crypto";

/**
 * Autoriza las tareas programadas (Cloud Scheduler): Authorization: Bearer <JOB_SECRET>.
 * Se ignoran espacios y saltos de línea en los dos lados: en Windows, un secreto creado desde la terminal
 * puede guardarse con un \r al final que el encabezado no lleva, y eso daba 401.
 */
export function isJobAuthorized(req: Request): boolean {
  const secret = process.env.JOB_SECRET?.trim() ?? "";
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
