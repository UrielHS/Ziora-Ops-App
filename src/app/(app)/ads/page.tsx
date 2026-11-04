import Link from "next/link";
import { asc, gte } from "drizzle-orm";
import { CircleDollarSign, MousePointerClick, UserPlus, Video } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts";
import { SINGLE_COLOR } from "@/lib/chart-colors";
import { ImportButton, lastDays, UtmButton } from "@/components/social";
import { Badge, Card, cn, Empty, Kpi, PageHeader, PanelHeader } from "@/components/ui";
import { db } from "@/db";
import { adCampaigns, adDaily, demoRequests, socialAccounts } from "@/db/schema";
import { adMetrics, attributeDemos, sumAds } from "@/domain/marketing";
import { money, todayISO } from "@/lib/format";
import { SOCIAL_PLATFORM } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/session";

export const dynamic = "force-dynamic";
const fmtInt = (n: number) => new Intl.NumberFormat("es-MX").format(n);
const mxn = (n: number | null) => (n == null ? "—" : money(n));

export default async function AdsPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const sp = await searchParams;
  const access = await requirePagePermission("analytics.view");
  const canEdit = can(access, "content.manage");
  const n = sp.dias === "90" ? 90 : 30;
  const days = lastDays(n, todayISO());
  const since = new Date(`${days[0]}T00:00:00-06:00`);
  const [accounts, campaigns, daily, demos] = await Promise.all([
    db.select().from(socialAccounts).orderBy(asc(socialAccounts.platform)),
    db.select().from(adCampaigns),
    db.select().from(adDaily).where(gte(adDaily.day, days[0])),
    db.select({ utm: demoRequests.utm, stage: demoRequests.stage }).from(demoRequests).where(gte(demoRequests.createdAt, since)),
  ]);

  const attribution = attributeDemos(campaigns, demos);
  const rows = campaigns
    .map((c) => {
      const t = sumAds(daily.filter((d) => d.campaignId === c.id));
      const a = attribution.get(c.id) ?? { demos: 0, customers: 0 };
      return { c, t, a, m: adMetrics(t, a.demos, a.customers) };
    })
    .filter((r) => r.t.spendCents > 0 || r.t.impressions > 0)
    .sort((x, y) => y.t.spendCents - x.t.spendCents);
  const total = sumAds(rows.map((r) => r.t));
  const totalDemos = rows.reduce((s, r) => s + r.a.demos, 0);
  const totalCustomers = rows.reduce((s, r) => s + r.a.customers, 0);
  const m = adMetrics(total, totalDemos, totalCustomers);
  // CPL alto: 50 % sobre la mediana de las campañas con leads.
  const cpls = rows.map((r) => r.m.cpl).filter((v): v is number => v != null).sort((a, b) => a - b);
  const medianCpl = cpls.length ? cpls[Math.floor(cpls.length / 2)] : null;
  const perDay = (key: "spendCents" | "leads") => days.map((d) => {
    const v = daily.filter((x) => x.day === d).reduce((s, x) => s + x[key], 0);
    return key === "spendCents" ? v / 100 : v;
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Marketing"
        title="Campañas pagadas"
        subtitle="Gasto y resultados por campaña. El costo por demo y por cliente usa las demos que llegaron con el utm_campaign de cada campaña."
        actions={<>
          <span className="flex rounded-full border border-line bg-white p-0.5 text-xs font-semibold">
            {[30, 90].map((d) => <Link key={d} href={`/ads?dias=${d}`} className={cn("rounded-full px-3 py-1.5", n === d ? "bg-mint text-emerald" : "text-muted")}>{d} días</Link>)}
          </span>
          {canEdit && accounts.length > 0 && <ImportButton accounts={accounts} kind="ads" />}
        </>}
      />

      {rows.length === 0 ? (
        <Empty
          title="Sin datos de campañas en este periodo"
          text={accounts.length ? "Meta Ads se sincroniza si la cuenta tiene cuenta publicitaria y token. Para TikTok o LinkedIn, importa el CSV diario." : "Primero agrega una cuenta en Redes sociales."}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Gasto" value={money(m.spend)} note={`CPM ${mxn(m.cpm)} · CPC ${mxn(m.cpc)}`} icon={CircleDollarSign} />
            <Kpi label="Leads (plataforma)" value={fmtInt(total.leads)} note={`CPL ${mxn(m.cpl)} · CTR ${m.ctr != null ? `${m.ctr}%` : "—"}`} icon={MousePointerClick} />
            <Kpi label="Demos atribuidas" value={fmtInt(totalDemos)} note={`Costo por demo ${mxn(m.costPerDemo)}`} icon={Video} highlight />
            <Kpi label="Clientes atribuidos" value={fmtInt(totalCustomers)} note={`Costo por cliente ${mxn(m.costPerCustomer)}`} icon={UserPlus} />
          </div>

          {/* Gasto y leads en gráficas separadas: escalas distintas, nunca doble eje. */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-5"><TimeSeriesChart title="Gasto diario (MXN)" kind="bar" format="mxn" days={days} series={[{ key: "spend", label: "Gasto", color: SINGLE_COLOR, values: perDay("spendCents") }]} /></Card>
            <Card className="p-5"><TimeSeriesChart title="Leads por día" kind="bar" days={days} series={[{ key: "leads", label: "Leads", color: SINGLE_COLOR, values: perDay("leads") }]} /></Card>
          </div>

          <Card>
            <PanelHeader title="Por campaña" subtitle="Define el UTM de cada campaña para que el costo por demo sea exacto." />
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-faint">
                  <th className="px-5 py-2 font-semibold">Campaña</th><th className="px-2 text-right font-semibold">Gasto</th><th className="px-2 text-right font-semibold">Impr.</th>
                  <th className="px-2 text-right font-semibold">CTR</th><th className="px-2 text-right font-semibold">CPC</th><th className="px-2 text-right font-semibold">Leads</th>
                  <th className="px-2 text-right font-semibold">CPL</th><th className="px-2 text-right font-semibold">Demos</th><th className="px-2 text-right font-semibold">$/demo</th>
                  <th className="px-5 font-semibold">UTM</th>
                </tr></thead>
                <tbody>
                  {rows.map(({ c, t, a, m: cm }) => {
                    const high = medianCpl != null && cm.cpl != null && cpls.length >= 3 && cm.cpl > medianCpl * 1.5;
                    return (
                      <tr key={c.id} className="border-b border-[#EFEDE6] last:border-b-0">
                        <td className="max-w-xs px-5 py-2.5">
                          <span className="line-clamp-1 font-semibold">{c.name}</span>
                          <span className="text-xs text-muted">{SOCIAL_PLATFORM[c.platform]}{c.objective ? ` · ${c.objective.toLowerCase().replace(/^outcome_/, "")}` : ""}{c.status ? ` · ${c.status.toLowerCase()}` : ""}</span>
                        </td>
                        <td className="px-2 text-right font-semibold">{money(cm.spend)}</td>
                        <td className="px-2 text-right">{fmtInt(t.impressions)}</td>
                        <td className="px-2 text-right">{cm.ctr != null ? `${cm.ctr}%` : "—"}</td>
                        <td className="px-2 text-right">{mxn(cm.cpc)}</td>
                        <td className="px-2 text-right">{fmtInt(t.leads)}</td>
                        <td className="px-2 text-right">{high ? <Badge tone="red" className="justify-end">{mxn(cm.cpl)} · alto</Badge> : mxn(cm.cpl)}</td>
                        <td className="px-2 text-right font-semibold">{a.demos}{a.customers ? <span className="text-xs font-normal text-muted"> · {a.customers} pagó</span> : ""}</td>
                        <td className="px-2 text-right">{mxn(cm.costPerDemo)}</td>
                        <td className="px-5">{canEdit ? <UtmButton c={c} /> : <span className="text-xs text-muted">{c.utmCampaign ?? "—"}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
