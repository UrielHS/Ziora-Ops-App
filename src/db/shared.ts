/**
 * Espejo de las tablas de Event Ops (schema "public").
 * Event Ops es el dueño: aquí NO se generan migraciones de estas tablas.
 * Solo se declaran las columnas que Ziora Ops usa. Si Event Ops cambia una columna
 * listada aquí, hay que actualizar este archivo.
 *
 * Requiere la migración de docs/event-ops-patch aplicada en Event Ops
 * (valores nuevos de enum: psychologist, lead, clinic, demo_form, ziora_app, gdl, mty...).
 */
import { sql } from "drizzle-orm";
import { boolean, date, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "operator", "volunteer"]);
export const cityEnum = pgEnum("city", ["cdmx", "nyc", "gdl", "mty", "other", "tbd"]);
export const eventStatusEnum = pgEnum("event_status", ["idea", "planning", "confirmed", "done", "cancelled"]);
export const contactTypeEnum = pgEnum("contact_type", ["person", "venue"]);
export const contactSourceEnum = pgEnum("contact_source", [
  "manual", "luma", "notion", "linkedin", "ai_tinkerers",
  "demo_form", "ziora_app", "facebook_group", "instagram", "csv_import",
]);
export const contactTagEnum = pgEnum("contact_tag", [
  "sponsor", "speaker", "panelist", "founder", "angel", "vc", "venue", "community_partner",
  "influencer", "hospital", "university", "volunteer", "attendee", "vendor",
  "psychologist", "lead", "clinic", "ziora_user",
]);

export const eventRoleEnum = pgEnum("event_role", [
  "speaker", "panelist", "moderator", "judge", "mentor", "guest", "volunteer", "vendor", "host", "sponsor_contact",
]);

export type CityValue = (typeof cityEnum.enumValues)[number];
export type ContactTag = (typeof contactTagEnum.enumValues)[number];
export type ContactSource = (typeof contactSourceEnum.enumValues)[number];

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull(),
  active: boolean("active").notNull(),
  image: text("image"),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: cityEnum("city"),
  website: text("website"),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: contactTypeEnum("type").notNull().default("person"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  organizationId: uuid("organization_id"),
  city: cityEnum("city"),
  linkedinUrl: text("linkedin_url"),
  website: text("website"),
  opensDoorsForZiora: boolean("opens_doors_for_ziora").notNull().default(false),
  source: contactSourceEnum("source").notNull().default("manual"),
  notes: text("notes"),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const contactTags = pgTable(
  "contact_tags",
  {
    contactId: uuid("contact_id").notNull(),
    tag: contactTagEnum("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.contactId, t.tag] })],
);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: cityEnum("city").notNull(),
  date: date("date"),
  status: eventStatusEnum("status").notNull(),
  registrationUrl: text("registration_url"),
});

export const eventContacts = pgTable("event_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull(),
  contactId: uuid("contact_id").notNull(),
  roleInEvent: eventRoleEnum("role_in_event").notNull(),
  confirmed: boolean("confirmed").notNull(),
});
