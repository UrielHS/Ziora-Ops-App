import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { contactConsents } from "@/db/schema";
import { contacts, contactTags, type CityValue, type ContactSource, type ContactTag } from "@/db/shared";

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
  city?: CityValue | null;
  source: ContactSource;
  tags: ContactTag[];
  details?: Record<string, unknown>;
  marketingOptIn?: { source: string; evidence?: string } | null;
};

/**
 * Crea o actualiza un contacto en la base compartida con Event Ops (public.contacts).
 * Nunca pisa datos existentes con vacíos: solo completa lo que falta y agrega etiquetas.
 */
export async function upsertSharedContact(db: Db, input: UpsertInput): Promise<string> {
  const email = normalizeEmail(input.email);
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(contacts).where(eq(contacts.email, email)).limit(1);
    let contactId: string;
    if (existing) {
      contactId = existing.id;
      await tx
        .update(contacts)
        .set({
          phone: existing.phone ?? input.phone ?? null,
          city: existing.city ?? input.city ?? null,
          details: sql`${contacts.details} || ${JSON.stringify(input.details ?? {})}::jsonb`,
        })
        .where(eq(contacts.id, contactId));
    } else {
      const [row] = await tx
        .insert(contacts)
        .values({
          type: "person",
          name: input.name.trim(),
          email,
          phone: input.phone ?? null,
          city: input.city ?? null,
          source: input.source,
          details: input.details ?? {},
        })
        .returning({ id: contacts.id });
      contactId = row.id;
    }
    if (input.tags.length) {
      await tx
        .insert(contactTags)
        .values(input.tags.map((tag) => ({ contactId, tag })))
        .onConflictDoNothing();
    }
    if (input.marketingOptIn) {
      await tx
        .insert(contactConsents)
        .values({
          contactId,
          channel: "email",
          optIn: true,
          source: input.marketingOptIn.source,
          evidence: input.marketingOptIn.evidence,
          optedInAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [contactConsents.contactId, contactConsents.channel],
          // Una baja previa gana: no se re-suscribe automáticamente a quien se dio de baja.
          set: { optIn: sql`case when ${contactConsents.optedOutAt} is null then true else ${contactConsents.optIn} end` },
        });
    }
    return contactId;
  });
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
