/**
 * Flujo de contenido: guardar piezas, revisión de tres roles y sugerencias del equipo.
 * Recibe la base de datos y a la persona que actúa; los permisos se validan en src/actions/content.ts.
 * Los avisos por correo se devuelven como datos (Notice) y la acción los envía.
 */
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { reviewers, reviewForPiece } from "@/db/content-review";
import { contentPieces, contentReviews, contentSuggestions, epics, tasks } from "@/db/schema";
import { users } from "@/db/shared";
import { CONTENT_REVIEWER_ROLES, type OpsRole } from "@/lib/permissions";
import { contentChanged, PUBLISHABLE_STATUSES } from "./content-review";

export type Actor = { id: string; name: string };
export type Notice = { to: string[]; subject: string; lines: string[]; link?: { href: string; label: string } };

const ROLE_NAME: Record<OpsRole, string> = {
  ceo: "CEO", sales: "Ventas", clinical_director: "Director clínico", marketing: "Marketing", operations: "Operaciones", dev_qa: "Dev / QA",
};
const roleList = (roles: OpsRole[]) => roles.map((r) => ROLE_NAME[r]).join(", ");

type PieceInsert = typeof contentPieces.$inferInsert;
export type PieceInput = Omit<PieceInsert, "id" | "createdAt" | "updatedAt" | "approvedBy"> & {
  title: string; copy: string | null; assetUrl: string | null;
};

async function emailOf(db: Db, userId: string | null) {
  if (!userId) return "";
  const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  return u?.email ?? "";
}

/** Crea o actualiza una pieza aplicando las reglas de publicación. */
export async function savePiece(db: Db, actor: Actor, id: string | null, row: PieceInput) {
  const [before] = id ? await db.select().from(contentPieces).where(eq(contentPieces.id, id)).limit(1) : [];
  if (id && !before) throw new Error("La pieza ya no existe.");
  // Si cambió lo que se va a publicar, las aprobaciones anteriores ya no valen.
  const reset = !!before && contentChanged(before, row);
  const status = row.status ?? "idea";

  if (PUBLISHABLE_STATUSES.has(status)) {
    if (!row.legalChecklistOk) throw new Error("Para aprobar, programar o publicar hay que completar toda la checklist legal (sección 5 del brief).");
    const review = id && !reset ? await reviewForPiece(db, id) : null;
    if (!review?.complete) {
      throw new Error(
        reset
          ? "Cambiaste el contenido: las aprobaciones se reiniciaron. Envíala a revisión de nuevo."
          : review?.changesRequested
            ? "Hay cambios pedidos en la revisión. Atiéndelos y vuelve a enviarla a revisión."
            : `Falta la aprobación de: ${roleList(review?.missingRoles ?? CONTENT_REVIEWER_ROLES)}. Envía la pieza a revisión.`,
      );
    }
  }

  let pieceId = id;
  await db.transaction(async (tx) => {
    if (id) {
      await tx.update(contentPieces).set(row).where(eq(contentPieces.id, id));
      if (reset) await tx.delete(contentReviews).where(eq(contentReviews.pieceId, id));
    } else {
      [{ id: pieceId }] = await tx.insert(contentPieces).values(row).returning({ id: contentPieces.id });
    }
  });

  const notices: Notice[] = [];
  const sentToReview = status === "legal_review" && (before?.status !== "legal_review" || reset);
  if (sentToReview) {
    const people = (await reviewers(db)).filter((r) => r.id !== actor.id);
    notices.push({
      to: people.map((p) => p.email),
      subject: `Revisión pendiente: ${row.title}`,
      lines: [`Hay una pieza de contenido esperando tu revisión: "${row.title}".`, "Apruébala o pide cambios antes de que se publique."],
      link: { href: `/content/review#${pieceId}`, label: "Abrir revisión" },
    });
  }
  return { pieceId: pieceId!, sentToReview, resetReviews: reset, notices };
}

/** Registra la decisión de un revisor y mueve la pieza si corresponde. */
export async function reviewPiece(
  db: Db, actor: Actor, input: { pieceId: string; decision: "approved" | "changes_requested"; comment?: string },
) {
  const { pieceId, decision } = input;
  const comment = input.comment?.trim() || null;
  if (decision === "changes_requested" && !comment) throw new Error("Escribe qué hay que cambiar.");
  const [piece] = await db.select().from(contentPieces).where(eq(contentPieces.id, pieceId)).limit(1);
  if (!piece) throw new Error("La pieza ya no existe.");
  if (piece.status !== "legal_review") throw new Error("Esta pieza no está en revisión.");

  await db
    .insert(contentReviews)
    .values({ pieceId, reviewerId: actor.id, decision, comment })
    .onConflictDoUpdate({ target: [contentReviews.pieceId, contentReviews.reviewerId], set: { decision, comment, updatedAt: new Date() } });

  const review = await reviewForPiece(db, pieceId);
  const owner = await emailOf(db, piece.ownerId);
  const notices: Notice[] = [];
  let status: (typeof piece)["status"] = piece.status;
  let message: string;

  if (decision === "changes_requested") {
    status = "draft";
    await db.update(contentPieces).set({ status }).where(eq(contentPieces.id, pieceId));
    notices.push({ to: [owner], subject: `Cambios pedidos: ${piece.title}`, lines: [`${actor.name} pidió cambios:`, comment!], link: { href: "/content/review", label: "Ver pieza" } });
    message = "Pediste cambios: la pieza regresó a borrador.";
  } else if (review.complete && piece.legalChecklistOk) {
    status = "approved";
    await db.update(contentPieces).set({ status, approvedBy: actor.id }).where(and(eq(contentPieces.id, pieceId), eq(contentPieces.status, "legal_review")));
    notices.push({ to: [owner], subject: `Aprobada: ${piece.title}`, lines: ["Los tres revisores aprobaron la pieza. Ya puedes programarla."], link: { href: "/content", label: "Ir al calendario" } });
    message = "Aprobación completa: la pieza quedó aprobada.";
  } else if (review.complete) {
    message = "Aprobaciones completas; falta que marketing complete la checklist legal.";
  } else {
    message = `Aprobada por ti. Falta: ${roleList(review.missingRoles)}.`;
  }
  return { status, review, message, notices };
}

export async function createSuggestion(
  db: Db, actor: Actor,
  input: { title: string; idea: string; why?: string; channel?: PieceInsert["channel"]; referenceUrl?: string },
) {
  const [row] = await db.insert(contentSuggestions).values({ ...input, authorId: actor.id }).returning({ id: contentSuggestions.id });
  return row.id;
}

export type SuggestionDecision =
  | { id: string; decision: "rejected"; note?: string }
  | { id: string; decision: "accepted"; note?: string; pillar: PieceInsert["pillar"]; channel: PieceInsert["channel"]; format: string; publishOn?: string };

/** Aceptar crea la pieza (estado idea) y la tarea de publicación; descartar exige explicar por qué. */
export async function decideSuggestion(db: Db, actor: Actor, d: SuggestionDecision) {
  const [s] = await db.select().from(contentSuggestions).where(eq(contentSuggestions.id, d.id)).limit(1);
  if (!s) throw new Error("La sugerencia ya no existe.");
  if (s.status !== "new") throw new Error("Esta sugerencia ya se decidió.");
  const note = d.note?.trim() || null;
  if (d.decision === "rejected" && !note) throw new Error("Explica brevemente por qué no se usará.");

  let pieceId: string | null = null;
  let taskId: string | null = null;
  if (d.decision === "accepted") {
    await db.transaction(async (tx) => {
      const [piece] = await tx.insert(contentPieces).values({
        title: s.title, pillar: d.pillar, channel: d.channel, format: d.format, status: "idea",
        publishOn: d.publishOn ?? null, ownerId: actor.id,
        copy: [s.idea, s.why ? `Por qué: ${s.why}` : null].filter(Boolean).join("\n\n"),
        sources: s.referenceUrl ? [s.referenceUrl] : [],
      }).returning({ id: contentPieces.id });
      const [gtm] = await tx.select({ id: epics.id }).from(epics).where(eq(epics.key, "GTM")).limit(1);
      const [task] = await tx.insert(tasks).values({
        title: `Publicar: ${s.title}`,
        description: `Sugerencia aceptada. La pieza ya está en el calendario de contenido.\n\n${s.idea}`,
        status: "todo", assigneeId: actor.id, reporterId: s.authorId, epicId: gtm?.id ?? null,
        dueOn: d.publishOn ?? null, labels: ["contenido", "sugerencia"],
      }).returning({ id: tasks.id });
      // Solo si sigue "new": evita que dos personas la acepten a la vez.
      const updated = await tx.update(contentSuggestions)
        .set({ status: "accepted", decidedBy: actor.id, decisionNote: note, pieceId: piece.id, taskId: task.id })
        .where(and(eq(contentSuggestions.id, s.id), eq(contentSuggestions.status, "new")))
        .returning({ id: contentSuggestions.id });
      if (updated.length === 0) throw new Error("Esta sugerencia ya se decidió.");
      pieceId = piece.id;
      taskId = task.id;
    });
  } else {
    await db.update(contentSuggestions).set({ status: "rejected", decidedBy: actor.id, decisionNote: note }).where(eq(contentSuggestions.id, s.id));
  }

  const author = await emailOf(db, s.authorId);
  const notice: Notice = d.decision === "accepted"
    ? { to: [author], subject: `Tu sugerencia se va a publicar: ${s.title}`, lines: ["Marketing aceptó tu sugerencia y ya está en el calendario de contenido.", ...(note ? [note] : [])], link: { href: "/content/suggestions", label: "Ver sugerencias" } }
    : { to: [author], subject: `Sobre tu sugerencia: ${s.title}`, lines: ["Marketing revisó tu sugerencia y por ahora no se usará.", note!], link: { href: "/content/suggestions", label: "Ver sugerencias" } };
  return { pieceId, taskId, notices: [notice] };
}
