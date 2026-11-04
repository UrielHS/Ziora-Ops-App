import { CONTENT_REVIEWER_ROLES, type OpsRole } from "@/lib/permissions";

export type ReviewInput = { reviewerId: string; reviewerRoles: OpsRole[]; decision: "approved" | "changes_requested" };

export type ReviewSummary = {
  approvedRoles: OpsRole[];
  missingRoles: OpsRole[];
  changesRequested: boolean;
  /** Todos los roles revisores aprobaron y nadie tiene cambios pendientes. */
  complete: boolean;
};

/**
 * Una aprobación cubre todos los roles revisores que tenga esa persona.
 * Una petición de cambios bloquea la pieza hasta que quien la pidió apruebe.
 */
export function summarizeReviews(reviews: ReviewInput[], required: OpsRole[] = CONTENT_REVIEWER_ROLES): ReviewSummary {
  const approvedRoles = required.filter((role) =>
    reviews.some((r) => r.decision === "approved" && r.reviewerRoles.includes(role)),
  );
  const missingRoles = required.filter((r) => !approvedRoles.includes(r));
  const changesRequested = reviews.some((r) => r.decision === "changes_requested");
  return { approvedRoles, missingRoles, changesRequested, complete: missingRoles.length === 0 && !changesRequested };
}

/** Estados que exigen checklist legal y revisión completa. */
export const PUBLISHABLE_STATUSES = new Set(["approved", "scheduled", "published"]);

/** Si cambia lo que el público verá, las aprobaciones anteriores ya no valen. */
export function contentChanged(
  before: { title: string; copy: string | null; assetUrl: string | null },
  after: { title: string; copy: string | null; assetUrl: string | null },
) {
  return before.title !== after.title || (before.copy ?? "") !== (after.copy ?? "") || (before.assetUrl ?? "") !== (after.assetUrl ?? "");
}
