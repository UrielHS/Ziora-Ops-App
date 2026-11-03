/**
 * Tablas propias de Ziora Ops, en el schema "ops" de la misma base que Event Ops.
 * drizzle-kit solo ve este archivo (ver drizzle.config.ts).
 */
import { sql } from "drizzle-orm";
import {
  boolean, date, index, integer, jsonb, pgSchema, primaryKey, serial, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import { contacts, events, users } from "./shared";

export const ops = pgSchema("ops");

// ---------- enums ----------
export const taskStatusEnum = ops.enum("task_status", ["backlog", "todo", "in_progress", "in_review", "done"]);
export const priorityEnum = ops.enum("priority", ["low", "medium", "high", "urgent"]);
export const sprintStatusEnum = ops.enum("sprint_status", ["planned", "active", "closed"]);
export const demoStageEnum = ops.enum("demo_stage", [
  "requested", "scheduled", "done", "no_show", "trial", "paid", "lost",
]);
export const bugSeverityEnum = ops.enum("bug_severity", ["critical", "high", "medium", "low"]);
export const bugStatusEnum = ops.enum("bug_status", [
  "new", "triaged", "in_progress", "fixed", "verified", "wont_fix", "duplicate",
]);
export const bugSourceEnum = ops.enum("bug_source", ["manual", "ziora_app", "sentry", "github"]);
export const prStateEnum = ops.enum("pr_state", ["open", "closed", "merged"]);
export const campaignStatusEnum = ops.enum("campaign_status", ["draft", "scheduled", "sending", "sent", "failed"]);
export const sendStatusEnum = ops.enum("send_status", [
  "queued", "sent", "delivered", "opened", "clicked", "bounced", "complained", "failed", "skipped",
]);
export const contentPillarEnum = ops.enum("content_pillar", [
  "producto", "ia_psicoterapia", "estudios", "roi", "psicoterapia_moderna", "memes",
]);
export const contentChannelEnum = ops.enum("content_channel", ["instagram", "tiktok", "facebook_group", "linkedin", "blog", "email"]);
export const contentStatusEnum = ops.enum("content_status", [
  "idea", "draft", "legal_review", "approved", "scheduled", "published", "discarded",
]);
export const riskEnum = ops.enum("risk", ["low", "medium", "high"]);

const id = () => uuid("id").primaryKey().defaultRandom();
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ---------- trabajo (tipo Jira) ----------
export const epics = ops.table("epics", {
  id: id(),
  key: text("key").notNull().unique(), // GTM, PROD, QA, VENTAS
  name: text("name").notNull(),
  color: text("color").notNull().default("#507060"),
  ...timestamps(),
});

export const sprints = ops.table("sprints", {
  id: id(),
  name: text("name").notNull(),
  goal: text("goal"),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  status: sprintStatusEnum("status").notNull().default("planned"),
  ...timestamps(),
});

export const tasks = ops.table(
  "tasks",
  {
    id: id(),
    number: serial("number").notNull().unique(), // se muestra como ZOP-<number>
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").notNull().default("backlog"),
    priority: priorityEnum("priority").notNull().default("medium"),
    epicId: uuid("epic_id").references(() => epics.id, { onDelete: "set null" }),
    sprintId: uuid("sprint_id").references(() => sprints.id, { onDelete: "set null" }),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    dueOn: date("due_on"),
    estimate: integer("estimate"),
    labels: text("labels").array().notNull().default(sql`'{}'::text[]`),
    blocker: boolean("blocker").notNull().default(false), // aparece en "Bloqueos activos" del dashboard
    position: integer("position").notNull().default(0),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    bugId: uuid("bug_id"),
    demoId: uuid("demo_id"),
    prUrl: text("pr_url"),
    ...timestamps(),
  },
  (t) => [
    index("tasks_status_idx").on(t.status),
    index("tasks_sprint_idx").on(t.sprintId),
    index("tasks_assignee_idx").on(t.assigneeId),
  ],
);

// ---------- ventas: demos ----------
export const demoRequests = ops.table(
  "demo_requests",
  {
    id: id(),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    whatsapp: text("whatsapp"),
    patientsPerWeek: text("patients_per_week"),
    teletherapy: text("teletherapy"),
    painPoint: text("pain_point"),
    stage: demoStageEnum("stage").notNull().default("requested"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    source: text("source").notNull().default("ziora-copilot.com/demo"),
    utm: jsonb("utm").$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),
    externalId: text("external_id"),
    raw: jsonb("raw").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    notes: text("notes"),
    lostReason: text("lost_reason"),
    ...timestamps(),
  },
  (t) => [
    index("demo_requests_stage_idx").on(t.stage),
    uniqueIndex("demo_requests_external_id_unique").on(t.externalId).where(sql`${t.externalId} is not null`),
  ],
);

// ---------- producto: QA y bugs ----------
export const bugs = ops.table(
  "bugs",
  {
    id: id(),
    number: serial("number").notNull().unique(), // BUG-<number>
    title: text("title").notNull(),
    description: text("description"),
    stepsToReproduce: text("steps_to_reproduce"),
    expected: text("expected"),
    actual: text("actual"),
    severity: bugSeverityEnum("severity").notNull().default("medium"),
    status: bugStatusEnum("status").notNull().default("new"),
    area: text("area"), // Checkout, Grabación, Nota, Portal, Videollamada...
    environment: text("environment").notNull().default("production"),
    device: text("device"),
    appVersion: text("app_version"),
    pageUrl: text("page_url"),
    source: bugSourceEnum("source").notNull().default("manual"),
    externalId: text("external_id"), // id de Sentry o issue de GitHub
    externalUrl: text("external_url"),
    reporterEmail: text("reporter_email"),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    prUrl: text("pr_url"),
    occurrences: integer("occurrences").notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    index("bugs_status_idx").on(t.status),
    uniqueIndex("bugs_source_external_unique").on(t.source, t.externalId).where(sql`${t.externalId} is not null`),
  ],
);

// ---------- producto: PRs de GitHub (caché) ----------
export const pullRequests = ops.table(
  "pull_requests",
  {
    id: id(),
    repo: text("repo").notNull(), // owner/name
    number: integer("number").notNull(),
    title: text("title").notNull(),
    author: text("author").notNull(),
    state: prStateEnum("state").notNull(),
    draft: boolean("draft").notNull().default(false),
    reviewState: text("review_state"), // approved | changes_requested | pending
    checksState: text("checks_state"), // success | failure | pending
    url: text("url").notNull(),
    headRef: text("head_ref"),
    baseRef: text("base_ref"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
    ghUpdatedAt: timestamp("gh_updated_at", { withTimezone: true }).notNull(),
    mergedAt: timestamp("merged_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [uniqueIndex("pull_requests_repo_number_unique").on(t.repo, t.number)],
);

// ---------- marketing: correo masivo ----------
export const emailTemplates = ops.table("email_templates", {
  id: id(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  previewText: text("preview_text"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  ...timestamps(),
});

export type CampaignSegment = {
  tags?: string[];
  cities?: string[];
  sources?: string[];
  eventId?: string; // invitados a un evento de Event Ops
  contactIds?: string[];
};

export const campaigns = ops.table("campaigns", {
  id: id(),
  name: text("name").notNull(),
  templateId: uuid("template_id").notNull().references(() => emailTemplates.id),
  subject: text("subject"), // si es null usa el de la plantilla
  fromEmail: text("from_email"),
  segment: jsonb("segment").$type<CampaignSegment>().notNull().default(sql`'{}'::jsonb`),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
  status: campaignStatusEnum("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  ...timestamps(),
});

export const campaignSends = ops.table(
  "campaign_sends",
  {
    id: id(),
    campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    status: sendStatusEnum("status").notNull().default("queued"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("campaign_sends_unique").on(t.campaignId, t.email),
    uniqueIndex("campaign_sends_provider_unique").on(t.providerMessageId).where(sql`${t.providerMessageId} is not null`),
  ],
);

// Consentimiento de correo de marketing (LFPDPPP). Sin fila con emailOptIn = true, no se envía.
export const contactConsents = ops.table(
  "contact_consents",
  {
    contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
    channel: text("channel").notNull().default("email"),
    optIn: boolean("opt_in").notNull().default(false),
    source: text("source").notNull(), // demo_form, evento, importación con aviso, manual
    evidence: text("evidence"), // texto o URL del aviso aceptado
    optedInAt: timestamp("opted_in_at", { withTimezone: true }),
    optedOutAt: timestamp("opted_out_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [primaryKey({ columns: [t.contactId, t.channel] })],
);

// ---------- marketing: calendario de contenido (plan GTM 90 días) ----------
export const contentPieces = ops.table(
  "content_pieces",
  {
    id: id(),
    title: text("title").notNull(),
    pillar: contentPillarEnum("pillar").notNull(),
    channel: contentChannelEnum("channel").notNull(),
    format: text("format").notNull(), // reel, carrusel, imagen, aporte
    status: contentStatusEnum("status").notNull().default("idea"),
    risk: riskEnum("risk").notNull().default("low"),
    publishOn: date("publish_on"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    copy: text("copy"),
    sources: text("sources").array().notNull().default(sql`'{}'::text[]`),
    assetUrl: text("asset_url"),
    publishedUrl: text("published_url"),
    metrics: jsonb("metrics").$type<Record<string, number>>().notNull().default(sql`'{}'::jsonb`),
    legalChecklistOk: boolean("legal_checklist_ok").notNull().default(false),
    ...timestamps(),
  },
  (t) => [index("content_pieces_publish_on_idx").on(t.publishOn)],
);

// ---------- métricas: metas del plan GTM (sección 9 del brief) ----------
export type GoalTargets = { d30: [number, number]; d60: [number, number]; d90: [number, number] };

export const goals = ops.table("goals", {
  id: id(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  source: text("source").notNull(), // Meta Insights, PostHog, registro manual...
  current: integer("current").notNull().default(0),
  // Si es "auto", se calcula desde la BD (demos, altas registradas aquí) en lugar de capturarse a mano.
  auto: text("auto"),
  targets: jsonb("targets").$type<GoalTargets>().notNull(),
  position: integer("position").notNull().default(0),
  ...timestamps(),
});

// ---------- equipo: roles funcionales de Ziora Ops ----------
// public.users.role (admin/operator/volunteer) es de Event Ops. Estos roles son propios de Ziora Ops
// y deciden qué ve y qué puede hacer cada persona. Una persona puede tener varios.
export const opsRoleEnum = ops.enum("ops_role", ["ceo", "sales", "clinical_director", "marketing", "operations", "dev_qa"]);

export const memberRoles = ops.table(
  "member_roles",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: opsRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.role] })],
);

// ---------- marketing: revisión de contenido y sugerencias ----------
// Una pieza se publica solo con la aprobación de cada rol revisor (CEO, director clínico y ventas)
// más la checklist legal. La última decisión de cada persona reemplaza a la anterior.
export const reviewDecisionEnum = ops.enum("review_decision", ["approved", "changes_requested"]);

export const contentReviews = ops.table(
  "content_reviews",
  {
    id: id(),
    pieceId: uuid("piece_id").notNull().references(() => contentPieces.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    decision: reviewDecisionEnum("decision").notNull(),
    comment: text("comment"),
    ...timestamps(),
  },
  (t) => [uniqueIndex("content_reviews_piece_reviewer_unique").on(t.pieceId, t.reviewerId)],
);

// Sugerencias de contenido de cualquier persona del equipo. No son tareas: marketing las revisa
// y, si las acepta, se crean la pieza en el calendario y la tarea de publicación.
export const suggestionStatusEnum = ops.enum("suggestion_status", ["new", "accepted", "rejected"]);

export const contentSuggestions = ops.table(
  "content_suggestions",
  {
    id: id(),
    title: text("title").notNull(),
    idea: text("idea").notNull(),
    why: text("why"),
    channel: contentChannelEnum("channel"),
    referenceUrl: text("reference_url"),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    status: suggestionStatusEnum("status").notNull().default("new"),
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
    decisionNote: text("decision_note"),
    pieceId: uuid("piece_id").references(() => contentPieces.id, { onDelete: "set null" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [index("content_suggestions_status_idx").on(t.status)],
);
