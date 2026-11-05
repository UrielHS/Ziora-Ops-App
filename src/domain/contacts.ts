import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { contactConsents, contacts, contactTagEnum, contactTags, type CityValue, type ContactSource, type ContactTag } from "@/db/schema";
import { eoContacts, eoContactTags, organizations } from "@/db/shared";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const CITY_ALIASES: Record<string, CityValue> = {
  cdmx: "cdmx", "ciudad de mexico": "cdmx", "ciudad de méxico": "cdmx", "mexico city": "cdmx",
  gdl: "gdl", guadalajara: "gdl", zapopan: "gdl",
  mty: "mty", monterrey: "mty", "san pedro garza garcia": "mty",
};
export function toCity(raw?: string | null): CityValue | null {
  if (!raw) return null;
  return CITY_ALIASES[raw.trim().toLowerCase()] ?? "other";
}

type UpsertInput = {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  city?: CityValue | null;
  cityName?: string | null;
  patientsPerWeek?: string | null;
  approach?: string | null;
  documentation?: string | null;
  aiUsage?: string | null;
  linkedinUrl?: string | null;
  website?: string | null;
  notes?: string | null;
  source: ContactSource;
  tags: ContactTag[];
  details?: Record<string, unknown>;
  eventOpsContactId?: string | null;
  marketingOptIn?: { source: string; evidence?: string } | null;
};

const TAGS = new Set<string>(contactTagEnum.enumValues);

/**
 * Crea o completa un contacto de Ziora Ops (ops.contacts), buscándolo por correo.
 * Nunca pisa datos existentes: solo llena lo vacío, agrega etiquetas y suma columnas nuevas a details.
 */
export async function upsertContact(db: Db, input: UpsertInput): Promise<{ id: string; created: boolean }> {
  const email = normalizeEmail(input.email);
  const fill = <T>(cur: T | null, next: T | null | undefined) => cur ?? next ?? null;
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(contacts).where(eq(contacts.email, email)).limit(1);
    let id: string;
    if (existing) {
      id = existing.id;
      await tx.update(contacts).set({
        phone: fill(existing.phone, input.phone), company: fill(existing.company, input.company),
        jobTitle: fill(existing.jobTitle, input.jobTitle), city: fill(existing.city, input.city),
        cityName: fill(existing.cityName, input.cityName),
        patientsPerWeek: fill(existing.patientsPerWeek, input.patientsPerWeek), approach: fill(existing.approach, input.approach),
        documentation: fill(existing.documentation, input.documentation), aiUsage: fill(existing.aiUsage, input.aiUsage),
        linkedinUrl: fill(existing.linkedinUrl, input.linkedinUrl), website: fill(existing.website, input.website),
        notes: fill(existing.notes, input.notes), eventOpsContactId: fill(existing.eventOpsContactId, input.eventOpsContactId),
        // Lo que ya tenía gana sobre lo importado.
        details: sql`${JSON.stringify(input.details ?? {})}::jsonb || ${contacts.details}`,
      }).where(eq(contacts.id, id));
    } else {
      const [row] = await tx.insert(contacts).values({
        name: input.name.trim() || email, email, phone: input.phone ?? null, company: input.company ?? null,
        jobTitle: input.jobTitle ?? null, city: input.city ?? null, cityName: input.cityName ?? null,
        patientsPerWeek: input.patientsPerWeek ?? null, approach: input.approach ?? null,
        documentation: input.documentation ?? null, aiUsage: input.aiUsage ?? null, linkedinUrl: input.linkedinUrl ?? null,
        website: input.website ?? null, notes: input.notes ?? null, source: input.source, details: input.details ?? {},
        eventOpsContactId: input.eventOpsContactId ?? null,
      }).returning({ id: contacts.id });
      id = row.id;
    }
    const tags = input.tags.filter((t) => TAGS.has(t));
    if (tags.length) await tx.insert(contactTags).values(tags.map((tag) => ({ contactId: id, tag }))).onConflictDoNothing();
    if (input.marketingOptIn) {
      await tx
        .insert(contactConsents)
        .values({
          contactId: id, channel: "email", optIn: true, source: input.marketingOptIn.source,
          evidence: input.marketingOptIn.evidence, optedInAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [contactConsents.contactId, contactConsents.channel],
          // Una baja previa gana: no se re-suscribe automáticamente a quien se dio de baja.
          set: { optIn: sql`case when ${contactConsents.optedOutAt} is null then true else ${contactConsents.optIn} end` },
        });
    }
    return { id, created: !existing };
  });
}

/**
 * Copia contactos de Event Ops a Ziora Ops. Copia independiente: después de importarlos, los cambios
 * de un lado no afectan al otro. Sin correo no se importan (no habría forma de evitar duplicados).
 * El consentimiento de correo NO se copia: Event Ops no lo registra.
 */
export async function importFromEventOps(db: Db, eventOpsIds: string[]) {
  if (!eventOpsIds.length) return { created: 0, completed: 0, skipped: 0 };
  const rows = await db
    .select({ c: eoContacts, org: organizations.name })
    .from(eoContacts)
    .leftJoin(organizations, eq(organizations.id, eoContacts.organizationId))
    .where(and(inArray(eoContacts.id, eventOpsIds), isNotNull(eoContacts.email)));
  const tagRows = await db.select().from(eoContactTags).where(inArray(eoContactTags.contactId, rows.map((r) => r.c.id)));
  let created = 0, completed = 0;
  for (const { c, org } of rows) {
    const r = await upsertContact(db, {
      name: c.name, email: c.email!, phone: c.phone, company: org, city: c.city as CityValue | null,
      linkedinUrl: c.linkedinUrl, website: c.website, notes: c.notes, source: "event_ops",
      tags: tagRows.filter((t) => t.contactId === c.id).map((t) => t.tag as ContactTag),
      details: { ...c.details, eventOpsSource: c.source }, eventOpsContactId: c.id,
    });
    if (r.created) created++; else completed++;
  }
  return { created, completed, skipped: eventOpsIds.length - rows.length };
}

export async function optOut(db: Db, contactId: string, channel = "email") {
  await db
    .insert(contactConsents)
    .values({ contactId, channel, optIn: false, source: "unsubscribe", optedOutAt: new Date() })
    .onConflictDoUpdate({
      target: [contactConsents.contactId, contactConsents.channel],
      set: { optIn: false, optedOutAt: new Date() },
    });
}

export async function optOutByEmail(db: Db, email: string) {
  const [c] = await db.select({ id: contacts.id }).from(contacts).where(and(eq(contacts.email, normalizeEmail(email)))).limit(1);
  if (c) await optOut(db, c.id);
}
