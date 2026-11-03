"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { contactConsents } from "@/db/schema";
import { cityEnum, contacts, contactSourceEnum, contactTagEnum, contactTags } from "@/db/shared";
import { optOut, upsertSharedContact } from "@/domain/contacts";
import { formAction, type ActionState } from "@/lib/action";
import { requireUser } from "@/lib/session";

const _createContact = formAction(
  z.object({
    name: z.string().trim().min(2).max(200),
    email: z.email("correo válido"),
    phone: z.string().max(40).optional(),
    city: z.enum(cityEnum.enumValues).optional(),
    source: z.enum(contactSourceEnum.enumValues).default("manual"),
    tags: z.array(z.enum(contactTagEnum.enumValues)).default([]),
    notes: z.string().max(2000).optional(),
    optIn: z.literal("on").optional(),
    evidence: z.string().max(300).optional(),
  }),
  async (d) => {
    await requireUser();
    if (d.optIn && !d.evidence) throw new Error("Indica cómo dio su permiso (formulario, evento, mensaje…)");
    const id = await upsertSharedContact(db, {
      name: d.name, email: d.email, phone: d.phone, city: d.city ?? null, source: d.source, tags: d.tags,
      marketingOptIn: d.optIn ? { source: "manual", evidence: d.evidence } : null,
    });
    if (d.notes) await db.update(contacts).set({ notes: d.notes }).where(eq(contacts.id, id));
    revalidatePath("/contacts");
    return "Contacto guardado. Ya aparece también en Event Ops.";
  },
);

const _updateContact = formAction(
  z.object({
    id: z.uuid(),
    name: z.string().trim().min(2).max(200),
    phone: z.string().max(40).optional(),
    city: z.enum(cityEnum.enumValues).optional(),
    notes: z.string().max(2000).optional(),
    tags: z.array(z.enum(contactTagEnum.enumValues)).default([]),
  }),
  async ({ id, tags, ...d }) => {
    await requireUser();
    await db.transaction(async (tx) => {
      await tx.update(contacts).set({ name: d.name, phone: d.phone ?? null, city: d.city ?? null, notes: d.notes ?? null }).where(eq(contacts.id, id));
      // Solo agrega etiquetas: Ziora Ops no tiene permiso de borrar en la base compartida.
      if (tags.length) await tx.insert(contactTags).values(tags.map((tag) => ({ contactId: id, tag }))).onConflictDoNothing();
    });
    revalidatePath("/contacts");
  },
);

const _setConsent = formAction(
  z.object({ contactId: z.uuid(), optIn: z.enum(["yes", "no"]), evidence: z.string().max(300).optional() }),
  async ({ contactId, optIn, evidence }) => {
    await requireUser();
    if (optIn === "no") {
      await optOut(db, contactId);
      revalidatePath("/contacts");
      return "Baja registrada";
    }
    if (!evidence) throw new Error("Describe la evidencia del permiso");
    const [cur] = await db.select().from(contactConsents).where(and(eq(contactConsents.contactId, contactId), eq(contactConsents.channel, "email")));
    if (cur?.optedOutAt) throw new Error("Este contacto se dio de baja. Solo él puede volver a suscribirse.");
    await db.insert(contactConsents)
      .values({ contactId, channel: "email", optIn: true, source: "manual", evidence, optedInAt: new Date() })
      .onConflictDoUpdate({ target: [contactConsents.contactId, contactConsents.channel], set: { optIn: true, evidence, optedInAt: new Date() } });
    revalidatePath("/contacts");
    return "Permiso registrado";
  },
);

// Next exige que cada export de un archivo "use server" sea una función async declarada.
export async function createContact(prev: ActionState, fd: FormData) {
  return _createContact(prev, fd);
}
export async function updateContact(prev: ActionState, fd: FormData) {
  return _updateContact(prev, fd);
}
export async function setConsent(prev: ActionState, fd: FormData) {
  return _setConsent(prev, fd);
}
