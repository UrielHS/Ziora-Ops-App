import { describe, expect, it } from "vitest";
import { contentChanged, summarizeReviews } from "./content-review";

const chris = { reviewerId: "c", reviewerRoles: ["ceo" as const] };
const rafa = { reviewerId: "r", reviewerRoles: ["clinical_director" as const] };
const euri = { reviewerId: "e", reviewerRoles: ["sales" as const] };

describe("summarizeReviews", () => {
  it("sin revisiones faltan los tres roles", () => {
    const s = summarizeReviews([]);
    expect(s.missingRoles).toEqual(["ceo", "clinical_director", "sales"]);
    expect(s.complete).toBe(false);
  });

  it("con dos aprobaciones falta el tercero", () => {
    const s = summarizeReviews([{ ...chris, decision: "approved" }, { ...rafa, decision: "approved" }]);
    expect(s.missingRoles).toEqual(["sales"]);
    expect(s.complete).toBe(false);
  });

  it("los tres aprueban: completa", () => {
    const s = summarizeReviews([chris, rafa, euri].map((r) => ({ ...r, decision: "approved" as const })));
    expect(s.complete).toBe(true);
  });

  it("una petición de cambios bloquea aunque los demás aprueben", () => {
    const s = summarizeReviews([{ ...chris, decision: "approved" }, { ...rafa, decision: "changes_requested" }, { ...euri, decision: "approved" }]);
    expect(s.changesRequested).toBe(true);
    expect(s.complete).toBe(false);
  });

  it("quien tiene varios roles cubre todos con una sola aprobación", () => {
    const s = summarizeReviews([{ reviewerId: "x", reviewerRoles: ["ceo", "sales"], decision: "approved" }, { ...rafa, decision: "approved" }]);
    expect(s.complete).toBe(true);
  });

  it("aprobar sin rol revisor no cuenta", () => {
    const s = summarizeReviews([{ reviewerId: "m", reviewerRoles: ["marketing"], decision: "approved" }]);
    expect(s.approvedRoles).toEqual([]);
  });
});

describe("contentChanged", () => {
  const base = { title: "A", copy: "texto", assetUrl: null };
  it("detecta cambios en copy", () => expect(contentChanged(base, { ...base, copy: "otro" })).toBe(true));
  it("null y vacío son iguales", () => expect(contentChanged({ ...base, copy: null }, { ...base, copy: "" })).toBe(false));
});
