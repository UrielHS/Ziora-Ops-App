/**
 * Convierte un evento de Google Calendar (demo agendada por ziora-copilot.com/demo en el calendario del CEO)
 * en los datos de una demo. Tolera dos formatos:
 *  - Programación de citas de Google ("Reservado por" / "Booked by" + respuestas en líneas pregunta/respuesta)
 *  - Descripción propia con líneas "Etiqueta: valor"
 */
export type RawCalendarEvent = {
  id: string;
  status?: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  organizer?: { email?: string; self?: boolean };
  creator?: { email?: string };
  attendees?: { email?: string; displayName?: string; organizer?: boolean; self?: boolean; resource?: boolean; responseStatus?: string }[];
  updated?: string;
};

export type ParsedDemoEvent = {
  externalId: string;
  cancelled: boolean;
  fullName: string;
  email: string;
  whatsapp?: string;
  patientsPerWeek?: string;
  teletherapy?: string;
  painPoint?: string;
  city?: string;
  scheduledAt: Date | null;
  link?: string;
};

const FIELDS: { key: keyof ParsedDemoEvent; patterns: RegExp[] }[] = [
  { key: "whatsapp", patterns: [/^whats\s*app/i, /^tel[eé]fono/i, /^phone/i, /^celular/i] },
  { key: "patientsPerWeek", patterns: [/pacientes\s+(por|a\s+la)\s+semana/i, /patients\s+per\s+week/i] },
  { key: "teletherapy", patterns: [/teleterapia/i, /videollamada/i, /teletherapy/i] },
  { key: "painPoint", patterns: [/qu[eé]\s+es\s+lo\s+que\s+m[aá]s\s+te\s+quita\s+tiempo/i, /m[aá]s\s+te\s+quita\s+tiempo/i, /what\s+takes/i] },
  { key: "city", patterns: [/^ciudad/i, /^city/i] },
  { key: "fullName", patterns: [/^nombre(\s+completo)?$/i, /^name$/i] },
  { key: "email", patterns: [/^correo/i, /^e-?mail/i] },
];

function stripHtml(s: string) {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function fieldFor(label: string): keyof ParsedDemoEvent | null {
  const l = label.trim().replace(/[¿?:*]+/g, "").trim();
  for (const f of FIELDS) if (f.patterns.some((p) => p.test(l))) return f.key;
  return null;
}

/** Extrae pares etiqueta → valor de "Etiqueta: valor" y de líneas pregunta/respuesta consecutivas. */
export function extractAnswers(description: string): Partial<Record<keyof ParsedDemoEvent, string>> {
  const lines = stripHtml(description).split(/\r?\n/).map((l) => l.trim());
  const out: Partial<Record<keyof ParsedDemoEvent, string>> = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const m = line.match(/^([^:]{2,80}):\s*(.+)$/);
    if (m) {
      const k = fieldFor(m[1]);
      if (k && !out[k]) out[k] = m[2].trim();
      continue;
    }
    const k = fieldFor(line);
    const next = lines[i + 1];
    if (k && next && !fieldFor(next) && !out[k]) {
      out[k] = next;
      i++;
    }
  }
  return out;
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /\+?\d[\d\s().-]{8,}\d/;

export function parseDemoEvent(e: RawCalendarEvent, ownEmails: string[] = []): ParsedDemoEvent | null {
  const own = new Set(ownEmails.map((x) => x.toLowerCase()));
  if (e.organizer?.email) own.add(e.organizer.email.toLowerCase());
  const desc = e.description ?? "";
  const answers = extractAnswers(desc);

  // Invitado externo: el asistente que no es el organizador, ni el dueño del calendario, ni una sala.
  const guest = (e.attendees ?? []).find((a) => a.email && !a.organizer && !a.self && !a.resource && !own.has(a.email.toLowerCase()));
  const email = (guest?.email ?? answers.email ?? stripHtml(desc).match(EMAIL_RE)?.[0])?.toLowerCase();
  if (!email || own.has(email)) return null; // sin persona externa no es una demo

  // Nombre: el del invitado, el del formulario, o el que va entre paréntesis en el título ("Demo Ziora (Andrea Ruiz)")
  const fromTitle = e.summary?.match(/\(([^)]+)\)\s*$/)?.[1] ?? e.summary?.match(/(?:con|with|-|–|:)\s*([^\-–:]+)$/i)?.[1];
  const fullName = (answers.fullName ?? guest?.displayName ?? fromTitle ?? email.split("@")[0]).trim();

  const start = e.start?.dateTime ?? (e.start?.date ? `${e.start.date}T12:00:00-06:00` : undefined);
  const phone = answers.whatsapp ?? stripHtml(desc).match(PHONE_RE)?.[0];

  return {
    externalId: `gcal:${e.id}`,
    cancelled: e.status === "cancelled",
    fullName,
    email,
    whatsapp: phone?.trim(),
    patientsPerWeek: answers.patientsPerWeek,
    teletherapy: normalizeYesNo(answers.teletherapy),
    painPoint: answers.painPoint?.slice(0, 300),
    city: answers.city,
    scheduledAt: start ? new Date(start) : null,
    link: e.htmlLink,
  };
}

function normalizeYesNo(v?: string) {
  if (!v) return undefined;
  if (/^(s[ií]|yes|y)\b/i.test(v.trim())) return "Sí";
  if (/^(no|n)\b/i.test(v.trim())) return "No";
  return v;
}
