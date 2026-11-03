import { describe, expect, it } from "vitest";
import { adMetrics, attributeDemos, parseAdsCsv, parseCsv, parseOrganicCsv, toISODate, toNumber } from "./marketing";

describe("adMetrics", () => {
  it("calcula CTR, CPC, CPM, CPL y costo por demo", () => {
    const m = adMetrics({ spendCents: 250000, impressions: 50000, clicks: 500, leads: 25, conversions: 0 }, 10, 2);
    expect(m).toEqual({ spend: 2500, ctr: 1, cpc: 5, cpm: 50, cpl: 100, costPerDemo: 250, costPerCustomer: 1250 });
  });
  it("sin denominador devuelve null, no 0", () => {
    const m = adMetrics({ spendCents: 1000, impressions: 0, clicks: 0, leads: 0, conversions: 0 });
    expect(m.ctr).toBeNull();
    expect(m.cpl).toBeNull();
    expect(m.costPerDemo).toBeNull();
  });
});

describe("attributeDemos", () => {
  it("cruza utm_campaign con la campaña (o su nombre en slug)", () => {
    const r = attributeDemos(
      [{ id: "a", name: "Demo Psicólogos GDL", utmCampaign: null }, { id: "b", name: "Otra", utmCampaign: "retargeting_nov" }],
      [
        { utm: { utm_campaign: "demo-psicologos-gdl" }, stage: "paid" },
        { utm: { utm_campaign: "Demo Psicologos GDL" }, stage: "scheduled" },
        { utm: { utm_campaign: "retargeting_nov" }, stage: "trial" },
        { utm: {}, stage: "paid" },
      ],
    );
    expect(r.get("a")).toEqual({ demos: 2, customers: 1 });
    expect(r.get("b")).toEqual({ demos: 1, customers: 0 });
  });
});

describe("CSV", () => {
  it("comillas, separador ; y BOM de Excel", () => {
    expect(parseCsv('﻿Fecha;Campaña;Gasto\n2026-11-01;"Demo; GDL";"1.234,50"\n')).toEqual([["Fecha", "Campaña", "Gasto"], ["2026-11-01", "Demo; GDL", "1.234,50"]]);
  });
  it("números en formato MX y EE. UU.", () => {
    expect(toNumber("$2,500.75")).toBe(2500.75);
    expect(toNumber("1.234,5")).toBe(1234.5);
    expect(toNumber("12,5")).toBe(12.5);
    expect(toNumber("12,500")).toBe(12500);
    expect(toNumber("")).toBeNull();
  });
  it("fechas con día primero", () => {
    expect(toISODate("03/11/2026")).toBe("2026-11-03");
    expect(toISODate("2026-11-03T00:00:00")).toBe("2026-11-03");
    expect(toISODate("ayer")).toBeNull();
  });
  it("orgánico en español", () => {
    const { rows, skipped } = parseOrganicCsv("Fecha,Seguidores,Alcance,Interacciones\n01/11/2026,1200,5400,310\ntotal,,,\n");
    expect(rows).toEqual([{ day: "2026-11-01", followers: 1200, reach: 5400, impressions: null, engagements: 310, profileViews: null, linkClicks: null }]);
    expect(skipped).toBe(1);
  });
  it("anuncios: gasto a centavos y campaña sin id usa el slug", () => {
    const { rows } = parseAdsCsv("Date,Campaign name,Amount spent (MXN),Impressions,Link clicks,Leads\n2026-11-01,Demo GDL,350.5,12000,140,6\n");
    expect(rows[0]).toEqual({ day: "2026-11-01", campaign: "Demo GDL", campaignId: "demo-gdl", spendCents: 35050, impressions: 12000, clicks: 140, leads: 6, conversions: 0 });
  });
  it("exige columnas mínimas", () => {
    expect(() => parseAdsCsv("Fecha,Campaña\n2026-11-01,X")).toThrow(/gasto/);
    expect(() => parseOrganicCsv("Seguidores\n10")).toThrow(/fecha/);
  });
});
