import Link from "next/link";
import { asc, desc, gte, isNotNull } from "drizzle-orm";
import { ExternalLink, RefreshCw } from "lucide-react";
import { syncSocialNow } from "@/actions/social";
import { TimeSeriesChart } from "@/components/charts";
import { PLATFORM_COLOR } from "@/lib/chart-colors";
import { AccountButton, ImportButton, lastDays } from "@/components/social";
import { Badge, btn, Card, cn, Empty, PageHeader, PanelHeader } from "@/components/ui";
import { db } from "@/db";
import { contentPieces, socialAccounts, socialDaily, socialPosts } from "@/db/schema";
import { fmtDate, relative, todayISO } from "@/lib/format";
import { SOCIAL_PLATFORM } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requirePagePermission } from "@/lib/session";

export const dynamic = "force-dynamic";
const fmtInt = (n: number) => new Intl.NumberFormat("es-MX").format(n);

export default async function SocialPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const sp = await searchParams;
  const access = await requirePagePermission("analytics.view");
  const canConnect = can(access, "integrations.manage");
  const canImport = can(access, "content.manage");
  const n = sp.dias === "90" ? 90 : 30;
  const days = lastDays(n, todayISO());
  const [accounts, daily, posts, pieces] = await Promise.all([
    db.select().from(socialAccounts).orderBy(asc(socialAccounts.platform)),
    db.select().from(socialDaily).where(gte(socialDaily.day, days[0])),
    db.select().from(socialPosts).where(gte(socialPosts.publishedAt, new Date(`${days[0]}T00:00:00-06:00`))).orderBy(desc(socialPosts.reach)).limit(12),
    db.select({ id: contentPieces.id, title: contentPieces.title, url: contentPieces.publishedUrl }).from(contentPieces).where(isNotNull(contentPieces.publishedUrl)),
  ]);

  const byAccount = (id: string) => daily.filter((d) => d.accountId === id);
  const valuesFor = (id: string, key: "followers" | "reach" | "engagements") => days.map((day) => byAccount(id).find((d) => d.day === day)?.[key] ?? null);
  const series = (key: "followers" | "reach") =>
    accounts.map((a) => ({ key: a.id, label: SOCIAL_PLATFORM[a.platform], color: PLATFORM_COLOR[a.platform], values: valuesFor(a.id, key) }));
  const stats = accounts.map((a) => {
    const f = valuesFor(a.id, "followers").filter((v): v is number => v != null);
    const reach = valuesFor(a.id, "reach").reduce<number>((s, v) => s + (v ?? 0), 0);
    const eng = valuesFor(a.id, "engagements").reduce<number>((s, v) => s + (v ?? 0), 0);
    return { a, followers: f.at(-1) ?? null, growth: f.length > 1 ? f.at(-1)! - f[0] : null, reach, engagementRate: reach ? (eng / reach) * 100 : null };
  });
  const pieceFor = (url: string | null) => (url ? pieces.find((p) => p.url && url.startsWith(p.url.replace(/\/$/, ""))) : undefined);
  const postAccount = (id: string) => accounts.find((a) => a.id === id);
  // Una línea por red: si hay dos cuentas de la misma red, se distinguen por usuario.
  const dupPlatforms = new Set(accounts.map((a) => a.platform).filter((p, i, arr) => arr.indexOf(p) !== i));
  const withLabels = (s: ReturnType<typeof series>) => s.map((x, i) => (dupPlatforms.has(accounts[i].platform) ? { ...x, label: `${x.label} ${accounts[i].handle}` } : x));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Marketing"
        title="Redes sociales"
        subtitle="Instagram y Facebook se sincronizan solos cada mañana. TikTok y LinkedIn entran por CSV hasta que aprueben sus APIs."
        actions={<>
          <span className="flex rounded-full border border-line bg-white p-0.5 text-xs font-semibold">
            {[30, 90].map((d) => <Link key={d} href={`/social?dias=${d}`} className={cn("rounded-full px-3 py-1.5", n === d ? "bg-mint text-emerald" : "text-muted")}>{d} días</Link>)}
          </span>
          {canImport && accounts.length > 0 && <ImportButton accounts={accounts} kind="organic" />}
          {canConnect && <AccountButton />}
        </>}
      />

      {accounts.length === 0 ? (
        <Empty title="Sin cuentas conectadas" text="Agrega la cuenta de Instagram, Facebook, TikTok o LinkedIn. Con token de Meta se sincroniza sola; para las demás, importa el CSV que exporta cada red." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(({ a, followers, growth, reach, engagementRate }) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="label flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PLATFORM_COLOR[a.platform] }} />{SOCIAL_PLATFORM[a.platform]}</p>
                  <span className="text-[11px] text-faint">{a.handle}</span>
                </div>
                <p className="mt-1 text-[28px] font-extrabold leading-tight">{followers != null ? fmtInt(followers) : "—"}</p>
                <p className="text-xs text-muted">
                  seguidores{growth != null && <span className={cn("ml-1 font-semibold", growth >= 0 ? "text-emerald" : "text-danger")}>{growth >= 0 ? "+" : ""}{fmtInt(growth)} en {n} días</span>}
                </p>
                <p className="mt-2 text-xs text-muted">Alcance {fmtInt(reach)} · interacción {engagementRate != null ? `${engagementRate.toFixed(1)}%` : "—"}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-5"><TimeSeriesChart title="Seguidores" days={days} series={withLabels(series("followers"))} /></Card>
            <Card className="p-5"><TimeSeriesChart title="Alcance diario" days={days} series={withLabels(series("reach"))} /></Card>
          </div>
        </>
      )}

      {posts.length > 0 && (
        <Card>
          <PanelHeader title="Publicaciones con más alcance" subtitle="Se ligan al calendario de contenido por la URL publicada." />
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-faint">
                <th className="px-5 py-2 font-semibold">Publicación</th><th className="px-2 text-right font-semibold">Alcance</th><th className="px-2 text-right font-semibold">Vistas</th>
                <th className="px-2 text-right font-semibold">Me gusta</th><th className="px-2 text-right font-semibold">Guardados</th><th className="px-5 text-right font-semibold">Compartidos</th>
              </tr></thead>
              <tbody>
                {posts.map((p) => {
                  const piece = pieceFor(p.url);
                  const acc = postAccount(p.accountId);
                  return (
                    <tr key={p.id} className="border-b border-[#EFEDE6] last:border-b-0">
                      <td className="max-w-md px-5 py-2.5">
                        <span className="line-clamp-1 font-semibold">{piece?.title ?? (p.caption || "Sin texto")}</span>
                        <span className="text-xs text-muted">
                          {acc ? SOCIAL_PLATFORM[acc.platform] : ""} · {fmtDate(p.publishedAt)}{p.mediaType ? ` · ${p.mediaType.toLowerCase()}` : ""}
                          {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-0.5 font-semibold text-emerald">Ver <ExternalLink className="h-3 w-3" /></a>}
                          {piece && <Badge tone="green" className="ml-2">En calendario</Badge>}
                        </span>
                      </td>
                      {[p.reach, p.views, p.likes, p.saves, p.shares].map((v, i) => <td key={i} className={cn("text-right", i === 4 ? "px-5" : "px-2", i === 0 && "font-semibold")}>{v != null ? fmtInt(v) : "—"}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {accounts.length > 0 && (
        <Card>
          <PanelHeader title="Cuentas" subtitle={canConnect ? "Token cifrado; nunca se muestra." : undefined} />
          <div className="mt-2">
            {accounts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 border-b border-[#EFEDE6] px-5 py-3 last:border-b-0">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PLATFORM_COLOR[a.platform] }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{SOCIAL_PLATFORM[a.platform]} · {a.handle}</span>
                  <span className="block truncate text-xs text-muted">
                    {a.tokenEncrypted ? "Sincronización automática" : "Solo CSV"} · {a.lastSyncAt ? `actualizado ${relative(a.lastSyncAt)}` : "sin datos todavía"}
                  </span>
                  {a.lastError && <span className="mt-1 block text-xs text-warn">{a.lastError}</span>}
                </span>
                {a.tokenEncrypted ? <Badge tone="green">Conectada</Badge> : <Badge tone="gray">CSV</Badge>}
                {canConnect && a.tokenEncrypted && (
                  <form action={syncSocialNow}><input type="hidden" name="id" value={a.id} /><button className={btn("ghost", "sm")} title="Sincronizar ahora"><RefreshCw className="h-3.5 w-3.5" /></button></form>
                )}
                {canConnect && <AccountButton a={a} trigger="Editar" triggerClass={btn("ghost", "sm")} />}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
