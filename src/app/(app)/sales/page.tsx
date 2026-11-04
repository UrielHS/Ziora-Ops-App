import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { AlarmClock, Building2, FileSignature, TrendingUp } from "lucide-react";
import { moveDeal } from "@/actions/sales";
import { AccountFormButton, DealFormButton } from "@/components/sales";
import { Avatar, Badge, Card, Empty, Kpi, PageHeader, PanelHeader } from "@/components/ui";
import { Kanban } from "@/components/ui/kanban";
import { db } from "@/db";
import { listUsers } from "@/db/queries";
import { accounts, contracts, deals } from "@/db/schema";
import { contractAlerts, contractedMrr, isLive, monthlyValue, OPEN_STAGES, staleDeals, weightedPipeline } from "@/domain/sales";
import { fmtDate, money, relative, todayISO } from "@/lib/format";
import { ACCOUNT_TYPE, BILLING_PERIOD, DEAL_STAGE } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/session";

export const dynamic = "force-dynamic";

const STAGE_ACCENT: Record<string, string> = {
  prospect: "bg-faint", meeting: "bg-[#1D5FA8]", proposal: "bg-[#6B4FA8]", negotiation: "bg-[#D99A2B]", won: "bg-emerald", lost: "bg-danger",
};

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ nueva?: string; cuenta?: string }> }) {
  const sp = await searchParams;
  const access = await requirePagePermission("sales.view");
  const canEdit = can(access, "sales.manage");
  const today = todayISO();
  const [users, accs, ds, cs] = await Promise.all([
    listUsers(),
    db.select().from(accounts).orderBy(asc(accounts.name)),
    db.select().from(deals).orderBy(desc(deals.updatedAt)),
    db.select().from(contracts),
  ]);
  const accName = (id: string) => accs.find((a) => a.id === id)?.name ?? "—";
  const userName = (id: string | null) => users.find((u) => u.id === id)?.name;
  const alerts = contractAlerts(cs, today);
  const stale = staleDeals(ds, new Date());
  const live = cs.filter((c) => isLive(c, today));
  // En el tablero: abiertas + ganadas/perdidas de los últimos 30 días.
  const recent = Date.now() - 30 * 86400000;
  const boardDeals = ds.filter((d) => OPEN_STAGES.includes(d.stage) || d.stageChangedAt.getTime() > recent);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Ventas"
        title="Cuentas y contratos"
        subtitle="Clínicas, universidades e instituciones: pipeline, contratos y renovaciones."
        actions={canEdit && <>
          <AccountFormButton users={users} triggerClass="inline-flex items-center rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-muted hover:text-ink" defaultOpen={sp.cuenta === "1"} />
          <DealFormButton accounts={accs} users={users} defaultOpen={sp.nueva === "1"} />
        </>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Pipeline ponderado" value={money(weightedPipeline(ds))} note="Mensual, según probabilidad por etapa" icon={TrendingUp} />
        <Kpi label="MRR contratado B2B" value={money(contractedMrr(cs, today))} note={`${live.length} contratos vigentes`} icon={FileSignature} highlight />
        <Kpi label="Renovaciones (60 días)" value={alerts.filter((a) => a.kind === "expiring").length} note={alerts.some((a) => a.kind === "expired") ? `${alerts.filter((a) => a.kind === "expired").length} vencidos sin renovar` : "Ninguno vencido"} icon={AlarmClock} />
        <Kpi label="Cuentas" value={accs.length} note={`${ds.filter((d) => OPEN_STAGES.includes(d.stage)).length} oportunidades abiertas`} icon={Building2} />
      </div>

      {(alerts.length > 0 || stale.length > 0) && (
        <Card className="p-5">
          <p className="label mb-3">Requiere atención</p>
          <div className="flex flex-col gap-2 text-sm">
            {alerts.map((a) => {
              const c = cs.find((x) => x.id === a.contractId)!;
              return (
                <Link key={a.contractId} href={`/sales/accounts/${c.accountId}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 hover:border-emerald/40">
                  <Badge tone={a.kind === "expired" ? "red" : a.days <= 30 ? "amber" : "gray"}>{a.kind === "expired" ? "Vencido" : `Vence en ${a.days} días`}</Badge>
                  <span className="font-semibold">{accName(c.accountId)}</span>
                  <span className="text-muted">CTR-{c.number} · {c.title} · {fmtDate(c.endsOn)}</span>
                </Link>
              );
            })}
            {stale.map((d) => (
              <Link key={d.id} href={`/sales/accounts/${d.accountId}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 hover:border-emerald/40">
                <Badge tone="amber">Sin movimiento</Badge>
                <span className="font-semibold">{accName(d.accountId)}</span>
                <span className="text-muted">{d.name} · {DEAL_STAGE[d.stage].label} {relative(d.stageChangedAt)}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <PanelHeader title="Pipeline" subtitle={canEdit ? "Arrastra para cambiar de etapa. Ganadas y perdidas se muestran 30 días." : "Ganadas y perdidas se muestran 30 días."} />
        <div className="mt-3">
          {boardDeals.length === 0 ? (
            <Empty title="Sin oportunidades" text="Crea una cuenta y su primera oportunidad para empezar el pipeline." />
          ) : (
            <Kanban
              minColWidth={170}
              columns={Object.entries(DEAL_STAGE).map(([id, v]) => ({ id, label: v.label, accent: STAGE_ACCENT[id] }))}
              onMove={moveDeal}
              items={boardDeals.map((d) => ({
                id: d.id,
                column: d.stage,
                node: (
                  <div className="rounded-xl border border-line bg-white p-3 text-sm shadow-xs">
                    <Link href={`/sales/accounts/${d.accountId}`} className="block font-semibold hover:text-emerald">{accName(d.accountId)}</Link>
                    <p className="text-xs text-muted">{d.name}</p>
                    <p className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-bold">{d.amountMxn ? `${money(d.amountMxn)} ${BILLING_PERIOD[d.billingPeriod].toLowerCase()}` : "Sin monto"}</span>
                      <Avatar name={userName(d.ownerId)} size={20} />
                    </p>
                    {d.expectedCloseOn && OPEN_STAGES.includes(d.stage) && <p className="mt-1 text-[11px] text-faint">Cierre {fmtDate(d.expectedCloseOn)}</p>}
                  </div>
                ),
              }))}
            />
          )}
        </div>
      </Card>

      <Card>
        <PanelHeader title="Cuentas" />
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-faint">
              <th className="px-5 py-2 font-semibold">Cuenta</th><th className="px-2 font-semibold">Tipo</th><th className="px-2 font-semibold">Ciudad</th>
              <th className="px-2 font-semibold">Responsable</th><th className="px-2 font-semibold">Abiertas</th><th className="px-5 text-right font-semibold">MRR vigente</th>
            </tr></thead>
            <tbody>
              {accs.map((a) => (
                <tr key={a.id} className="border-b border-[#EFEDE6] last:border-b-0">
                  <td className="px-5 py-2.5"><Link href={`/sales/accounts/${a.id}`} className="font-semibold hover:text-emerald">{a.name}</Link></td>
                  <td className="px-2 text-muted">{ACCOUNT_TYPE[a.type]}</td>
                  <td className="px-2 text-muted">{a.city ?? "—"}</td>
                  <td className="px-2 text-muted">{userName(a.ownerId) ?? "—"}</td>
                  <td className="px-2">{ds.filter((d) => d.accountId === a.id && OPEN_STAGES.includes(d.stage)).length}</td>
                  <td className="px-5 text-right font-semibold">{money(live.filter((c) => c.accountId === a.id).reduce((s, c) => s + monthlyValue(c.amountMxn, c.billingPeriod), 0))}</td>
                </tr>
              ))}
              {accs.length === 0 && <tr><td colSpan={6} className="px-5 py-6 text-center text-muted">Todavía no hay cuentas.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
