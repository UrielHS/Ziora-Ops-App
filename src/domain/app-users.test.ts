import { describe, expect, it } from "vitest";
import { estimatedMrr, followupCandidates, isActive, Snapshot, summarizeByPlan } from "./app-users";

const now = new Date("2026-11-03T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
const prices = [
  { plan: "free", priceMxn: 0, billingPeriod: "monthly" as const, paying: false },
  { plan: "pro", priceMxn: 590, billingPeriod: "monthly" as const, paying: true },
  { plan: "pro_anual", priceMxn: 5900, billingPeriod: "annual" as const, paying: true },
];

describe("snapshot de la app", () => {
  const user = { uid: "u1", email: "psic@example.com", plan: "pro", status: "active", patientCount: 12, sessionsLast30d: 30 };
  it("acepta solo los campos permitidos", () => {
    expect(Snapshot.safeParse({ generatedAt: now.toISOString(), users: [user] }).success).toBe(true);
  });
  it("rechaza cualquier campo extra (protección de datos de pacientes)", () => {
    const r = Snapshot.safeParse({ generatedAt: now.toISOString(), users: [{ ...user, patients: [{ name: "X" }] }] });
    expect(r.success).toBe(false);
    expect(Snapshot.safeParse({ generatedAt: now.toISOString(), users: [], patientNames: [] }).success).toBe(false);
  });
});

describe("métricas", () => {
  it("activo = entró en los últimos 14 días", () => {
    expect(isActive(daysAgo(3), now)).toBe(true);
    expect(isActive(daysAgo(15), now)).toBe(false);
    expect(isActive(null, now)).toBe(false);
  });

  const users = [
    { plan: "pro", status: "active", lastActiveAt: daysAgo(1), patientCount: 10 },
    { plan: "pro", status: "trialing", lastActiveAt: daysAgo(2), patientCount: 3 },
    { plan: "pro", status: "cancelled", lastActiveAt: daysAgo(40), patientCount: 7 },
    { plan: "pro_anual", status: "active", lastActiveAt: daysAgo(20), patientCount: 20 },
    { plan: "free", status: "active", lastActiveAt: daysAgo(1), patientCount: 2 },
  ];
  it("MRR estimado: solo de pago, sin trials ni cancelados; anual entre 12", () => {
    expect(estimatedMrr(users, prices)).toBe(590 + 492);
  });
  it("resumen por plan", () => {
    expect(summarizeByPlan(users, prices, now).find((s) => s.plan === "pro")).toEqual({ plan: "pro", users: 3, active: 2, paying: 1, patients: 20, estimatedMrrMxn: 590 });
  });
  it("candidatos a seguimiento", () => {
    const c = followupCandidates([
      { plan: "pro_anual", status: "active", lastActiveAt: daysAgo(9), patientCount: 1, trialEndsAt: null },
      { plan: "pro", status: "active", lastActiveAt: daysAgo(2), patientCount: 1, trialEndsAt: null },
      { plan: "pro", status: "trialing", lastActiveAt: daysAgo(1), patientCount: 1, trialEndsAt: new Date(now.getTime() + 3 * 86400000) },
      { plan: "pro", status: "trialing", lastActiveAt: daysAgo(1), patientCount: 1, trialEndsAt: new Date(now.getTime() + 9 * 86400000) },
    ], prices, now);
    expect(c.map((x) => x.reason)).toEqual(["paying_inactive", "trial_ending"]);
  });
});
