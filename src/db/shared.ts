/**
 * Espejo de las tablas de Event Ops (schema "public"). Event Ops es el dueño: aquí NO se generan migraciones.
 * Solo se declaran las columnas que Ziora Ops LEE. Los contactos de Event Ops (eoContacts) ya no se muestran
 * ni se escriben: solo se leen en "Importar de Event Ops" para copiarlos a ops.contacts.
 */
import { sql } from "drizzle-orm";
import { boolean, date, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "operator", "volunteer"]);
export const eoCityEnum = pgEnum("city", ["cdmx", "nyc", "gdl", "mty", "other", "tbd"]);
export const eventStatusEnum = pgEnum("event_status", ["idea", "planning", "confirmed", "done", "cancelled"]);
export const eoContactTypeEnum = pgEnum("contact_type", ["person", "venue"]);
export const eoContactSourceEnum = pgEnum("contact_source", [
  "manual", "luma", "notion", "linkedin", "ai_tinkerers",
  "demo_form", "ziora_app", "facebook_group", "instagram", "csv_import",
]);
export const eoContactTagEnum = pgEnum("contact_tag", [
  "sponsor", "speaker", "panelist", "founder", "angel", "vc", "venue", "community_partner",
  "influencer", "hospital", "university", "volunteer", "attendee", "vendor",
  "psychologist", "lead", "clinic", "ziora_user",
]);

export const eventRoleEnum = pgEnum("event_role", [
  "speaker", "panelist", "moderator", "judge", "mentor", "guest", "volunteer", "vendor", "host", "sponsor_contact",
]);

export type EoCity = (typeof eoCityEnum.enumValues)[number];
export type EoContactTag = (typeof eoContactTagEnum.enumValues)[number];
export type EoContactSource = (typeof eoContactSourceEnum.enumValues)[number];

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
  city: eoCityEnum("city"),
  website: text("website"),
});

export const eoContacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: eoContactTypeEnum("type").notNull().default("person"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  organizationId: uuid("organization_id"),
  city: eoCityEnum("city"),
  linkedinUrl: text("linkedin_url"),
  website: text("website"),
  opensDoorsForZiora: boolean("opens_doors_for_ziora").notNull().default(false),
  source: eoContactSourceEnum("source").notNull().default("manual"),
  notes: text("notes"),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const eoContactTags = pgTable(
  "contact_tags",
  {
    contactId: uuid("contact_id").notNull(),
    tag: eoContactTagEnum("tag").notNull(),
  },
  (t) => [primaryKey({ columns: [t.contactId, t.tag] })],
);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: eoCityEnum("city").notNull(),
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
