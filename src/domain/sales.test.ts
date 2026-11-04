import { describe, expect, it } from "vitest";
import { contractAlerts, contractedMrr, isLive, monthlyValue, staleDeals, weightedPipeline } from "./sales";

const today = "2026-11-03";

describe("monthlyValue", () => {
  it("anual se divide entre 12, pago único no cuenta", () => {
    expect(monthlyValue(120000, "annual")).toBe(10000);
    expect(monthlyValue(5000, "monthly")).toBe(5000);
    expect(monthlyValue(30000, "one_time")).toBe(0);
    expect(monthlyValue(null, "monthly")).toBe(0);
  });
});

describe("weightedPipeline", () => {
  it("pondera por etapa e ignora ganadas y perdidas", () => {
    expect(weightedPipeline([
      { stage: "proposal", amountMxn: 10000, billingPeriod: "monthly" }, // 4500
      { stage: "negotiation", amountMxn: 120000, billingPeriod: "annual" }, // 7000
      { stage: "won", amountMxn: 99999, billingPeriod: "monthly" },
      { stage: "lost", amountMxn: 99999, billingPeriod: "monthly" },
    ])).toBe(11500);
  });
});

describe("contratos", () => {
  const base = { id: "a", status: "active" as const, startsOn: "2026-01-01", endsOn: "2026-12-31", autoRenew: false, amountMxn: 8000, billingPeriod: "monthly" as const };
  it("vigencia", () => {
    expect(isLive(base, today)).toBe(true);
    expect(isLive({ ...base, startsOn: "2026-12-01" }, today)).toBe(false);
    expect(isLive({ ...base, endsOn: "2026-10-01" }, today)).toBe(false);
    expect(isLive({ ...base, endsOn: "2026-10-01", autoRenew: true }, today)).toBe(true);
    expect(isLive({ ...base, status: "draft" }, today)).toBe(false);
  });
  it("MRR contratado solo suma los vigentes", () => {
    expect(contractedMrr([base, { ...base, status: "cancelled" }, { ...base, amountMxn: 96000, billingPeriod: "annual" }], today)).toBe(16000);
  });
  it("alertas de vencimiento", () => {
    const alerts = contractAlerts([
      { ...base, id: "pronto", endsOn: "2026-11-20" },
      { ...base, id: "lejos", endsOn: "2027-06-01" },
      { ...base, id: "vencido", endsOn: "2026-10-30" },
      { ...base, id: "renueva", endsOn: "2026-10-30", autoRenew: true },
      { ...base, id: "borrador", status: "draft", endsOn: "2026-11-10" },
    ], today);
    expect(alerts).toEqual([
      { contractId: "vencido", kind: "expired", days: -4 },
      { contractId: "pronto", kind: "expiring", days: 17 },
    ]);
  });
});

describe("staleDeals", () => {
  it("abiertas sin movimiento en 14 días", () => {
    const now = new Date("2026-11-03T12:00:00Z");
    const ds = [
      { id: 1, stage: "proposal" as const, stageChangedAt: new Date("2026-10-10T12:00:00Z") },
      { id: 2, stage: "proposal" as const, stageChangedAt: new Date("2026-10-30T12:00:00Z") },
      { id: 3, stage: "won" as const, stageChangedAt: new Date("2026-09-01T12:00:00Z") },
    ];
    expect(staleDeals(ds, now).map((d) => d.id)).toEqual([1]);
  });
});
