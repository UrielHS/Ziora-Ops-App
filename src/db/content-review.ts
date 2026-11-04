import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { contentReviews, memberRoles } from "@/db/schema";
import { users } from "@/db/shared";
import { summarizeReviews, type ReviewSummary } from "@/domain/content-review";
import { CONTENT_REVIEWER_ROLES, type OpsRole } from "@/lib/permissions";

export type ReviewRow = { reviewerId: string; reviewerName: string; decision: "approved" | "changes_requested"; comment: string | null; updatedAt: Date };
export type PieceReview = ReviewSummary & { reviews: ReviewRow[] };

async function rolesByUser(db: Db, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, OpsRole[]>();
  const rows = await db.select().from(memberRoles).where(inArray(memberRoles.userId, userIds));
  const map = new Map<string, OpsRole[]>();
  for (const r of rows) map.set(r.userId, [...(map.get(r.userId) ?? []), r.role]);
  return map;
}

/** Resumen de revisión por pieza (quién aprobó, qué rol falta, si hay cambios pedidos). */
export async function reviewsForPieces(db: Db, pieceIds: string[]): Promise<Map<string, PieceReview>> {
  const out = new Map<string, PieceReview>();
  if (pieceIds.length === 0) return out;
  const rows = await db
    .select({
      pieceId: contentReviews.pieceId, reviewerId: contentReviews.reviewerId, reviewerName: users.name,
      decision: contentReviews.decision, comment: contentReviews.comment, updatedAt: contentReviews.updatedAt,
    })
    .from(contentReviews)
    .innerJoin(users, eq(users.id, contentReviews.reviewerId))
    .where(inArray(contentReviews.pieceId, pieceIds));
  const roles = await rolesByUser(db, [...new Set(rows.map((r) => r.reviewerId))]);
  for (const id of pieceIds) {
    const reviews = rows.filter((r) => r.pieceId === id);
    const summary = summarizeReviews(reviews.map((r) => ({ reviewerId: r.reviewerId, reviewerRoles: roles.get(r.reviewerId) ?? [], decision: r.decision })));
    out.set(id, { ...summary, reviews });
  }
  return out;
}

export async function reviewForPiece(db: Db, pieceId: string) {
  return (await reviewsForPieces(db, [pieceId])).get(pieceId)!;
}

/** Personas activas con algún rol revisor (para avisarles). */
export async function reviewers(db: Db) {
  return db
    .selectDistinct({ id: users.id, name: users.name, email: users.email })
    .from(memberRoles)
    .innerJoin(users, eq(users.id, memberRoles.userId))
    .where(and(inArray(memberRoles.role, CONTENT_REVIEWER_ROLES), eq(users.active, true)));
}
