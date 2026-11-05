/**
 * Importación de la hoja de leads ("Leads Ziora MTW"). Se toman solo las columnas de Nombre a Ciudad:
 * Nombre, Email, Teléfono, Rol, Pacientes/sem, Enfoque, Documentación, Usa IA y Ciudad.
 * Los encabezados se reconocen sin importar mayúsculas, acentos o espacios; cualquier otra columna se ignora.
 */
import type { Db } from "@/db";
import type { ContactTag } from "@/db/schema";
import { normalizeEmail, toCity, upsertContact } from "./contacts";
import { parseCsv, slug } from "./marketing";

type Field = "name" | "email" | "phone" | "jobTitle" | "patientsPerWeek" | "approach" | "documentation" | "aiUsage" | "cityName";

const ALIASES: Record<Field, string[]> = {
  name: ["nombre", "name", "nombre-completo"],
  email: ["email", "correo", "correo-electronico", "e-mail"],
  phone: ["telefono", "phone", "whatsapp", "celular"],
  jobTitle: ["rol", "role", "puesto"],
  patientsPerWeek: ["pacientes-sem", "pacientes-por-semana", "pacientes"],
  approach: ["enfoque"],
  documentation: ["documentacion"],
  aiUsage: ["usa-ia", "uso-de-ia"],
  cityName: ["ciudad", "city"],
};

/** Columnas que se importan, en el orden de la hoja. */
export const LEAD_COLUMNS = ["Nombre", "Email", "Teléfono", "Rol", "Pacientes/sem", "Enfoque", "Documentación", "Usa IA", "Ciudad"];

export type LeadRow = {
  line: number;
  name: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  patientsPerWeek?: string;
  approach?: string;
  documentation?: string;
  aiUsage?: string;
  cityName?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseLeadSheet(text: string) {
  const [header, ...data] = parseCsv(text);
  if (!header) throw new Error("El archivo está vacío.");
  const keys = header.map((h) => slug(h));
  const col = {} as Partial<Record<Field, number>>;
  (Object.keys(ALIASES) as Field[]).forEach((f) => {
    const i = keys.findIndex((k) => ALIASES[f].includes(k));
    if (i >= 0) col[f] = i;
  });
  if (col.email === undefined) throw new Error("La hoja no tiene columna Email.");
  if (col.name === undefined) throw new Error("La hoja no tiene columna Nombre.");
  const used = new Set(Object.values(col));
  const ignoredColumns = header.map((h) => h.trim()).filter((h, i) => h && !used.has(i));

  const rows: LeadRow[] = [];
  const skipped: { line: number; reason: string }[] = [];
  const seen = new Set<string>();
  data.forEach((r, idx) => {
    const line = idx + 2; // 1 = encabezados
    const get = (f: Field) => (col[f] === undefined ? undefined : r[col[f]!]?.trim() || undefined);
    const email = get("email") ? normalizeEmail(get("email")!) : "";
    if (!EMAIL.test(email)) return skipped.push({ line, reason: email ? `correo inválido (${email})` : "sin correo" });
    if (seen.has(email)) return skipped.push({ line, reason: `correo repetido en la hoja (${email})` });
    seen.add(email);
    rows.push({
      line, email, name: get("name") ?? email, phone: get("phone"), jobTitle: get("jobTitle"),
      patientsPerWeek: get("patientsPerWeek"), approach: get("approach"), documentation: get("documentation"),
      aiUsage: get("aiUsage"), cityName: get("cityName"),
    });
  });
  return { rows, skipped, ignoredColumns };
}

/** Etiquetas que se deducen de la hoja: todos son lead; psicólogos y directores de clínica según el Rol. */
export function leadTags(r: LeadRow): ContactTag[] {
  const tags: ContactTag[] = ["lead"];
  const role = (r.jobTitle ?? "").toLowerCase();
  if (/psic/.test(role) || (r.approach && !/estudiante/.test(role))) tags.push("psychologist");
  if (/director|coordinador/.test(role)) tags.push("clinic");
  return tags;
}

/** Crea o completa cada lead (por correo). Nunca duplica ni pisa datos que ya existían. */
export async function importLeadSheet(db: Db, rows: LeadRow[]) {
  let created = 0, completed = 0;
  for (const r of rows) {
    const res = await upsertContact(db, {
      name: r.name, email: r.email, phone: r.phone, jobTitle: r.jobTitle, city: toCity(r.cityName), cityName: r.cityName,
      patientsPerWeek: r.patientsPerWeek, approach: r.approach, documentation: r.documentation, aiUsage: r.aiUsage,
      source: "sheet_import", tags: leadTags(r),
    });
    if (res.created) created++; else completed++;
  }
  return { created, completed };
}
