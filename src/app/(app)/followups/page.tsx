import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { Sparkles } from "lucide-react";
import { moveDemo } from "@/actions/demos";
import { suggestFollowupsNow } from "@/actions/followups";
import { FollowupRow, NewFollowupButton } from "@/components/followups";
import { Badge, btn, Card, Empty, PageHeader, PanelHeader } from "@/components/ui";
import { db } from "@/db";
import { listUsers } from "@/db/queries";
import { accounts, appUsers, demoRequests, followups } from "@/db/schema";
import { fmtDateTime, todayISO, waLink } from "@/lib/format";
import { DEMO_STAGE } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { requireAccess } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function FollowupsPage({ searchParams }: { searchParams: Promise<{ todos?: string; nuevo?: string }> }) {
  const sp = await searchParams;
  const access = await requireAccess();
  const canEdit = can(access, "followups.manage");
  const mineOnly = sp.todos !== "1";
  const today = todayISO();
  const weekEnd = new Date(Date.now() + 7 * 86400000);

  const [users, accs, pending, done, demos] = await Promise.all([
    listUsers(),
    db.select({ id: accounts.id, name: accounts.name }).from(accounts).orderBy(asc(accounts.name)),
    db.select().from(followups).where(and(eq(followups.status, "pending"), mineOnly ? eq(followups.ownerId, access.user.id) : undefined)).orderBy(asc(followups.dueOn)),
    db.select().from(followups).where(and(eq(followups.status, "done"), mineOnly ? eq(followups.ownerId, access.user.id) : undefined)).orderBy(desc(followups.completedAt)).limit(15),
    db.select().from(demoRequests).where(and(gte(demoRequests.scheduledAt, new Date(`${today}T00:00:00-06:00`)), lte(demoRequests.scheduledAt, weekEnd), inArray(demoRequests.stage, ["requested", "scheduled"]))).orderBy(asc(demoRequests.scheduledAt)),
  ]);
  const uids = [...new Set([...pending, ...done].map((f) => f.appUserUid).filter(Boolean))] as string[];
  const people = uids.length ? await db.select({ uid: appUsers.uid, email: appUsers.email, name: appUsers.name, plan: appUsers.plan }).from(appUsers).where(inArray(appUsers.uid, uids)) : [];
  const subject = (f: typeof followups.$inferSelect) => {
    if (f.appUserUid) {
      const p = people.find((x) => x.uid === f.appUserUid);
      return <Link href={`/customers?q=${encodeURIComponent(p?.email ?? "")}`} className="hover:text-emerald">{p?.name ?? p?.email ?? "Usuario"}{p ? ` (${p.plan})` : ""}</Link>;
    }
    if (f.accountId) return <Link href={`/sales/accounts/${f.accountId}`} className="hover:text-emerald">{accs.find((a) => a.id === f.accountId)?.name ?? "Cuenta"}</Link>;
    return "Demo";
  };
  const owner = (id: string | null) => users.find((u) => u.id === id)?.name;
  const dueNow = pending.filter((f) => f.dueOn <= today);
  const later = pending.filter((f) => f.dueOn > today);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Clientes"
        title="Seguimiento 1:1"
        subtitle="Demos de la semana y seguimiento a terapeutas y clínicas. Las sugerencias se crean solas al sincronizar con la app."
        actions={<>
          <Link href={mineOnly ? "/followups?todos=1" : "/followups"} className={btn("ghost")}>{mineOnly ? "Ver de todo el equipo" : "Solo los míos"}</Link>
          {canEdit && <form action={suggestFollowupsNow}><button className={btn("ghost")}><Sparkles className="h-4 w-4" /> Buscar sugerencias</button></form>}
          {canEdit && <NewFollowupButton users={users} accounts={accs} defaultOpen={sp.nuevo === "1"} />}
        </>}
      />

      <Card>
        <PanelHeader title={`Demos de esta semana (${demos.length})`} subtitle="Después de cada demo, registra el resultado con un clic." action={<Link href="/demos" className={btn("ghost", "sm")}>Pipeline ↗</Link>} />
        <div className="mt-2">
          {demos.length === 0 && <p className="px-5 pb-5 text-sm text-muted">No hay demos agendadas en los próximos 7 días.</p>}
          {demos.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 border-b border-[#EFEDE6] px-5 py-3 last:border-b-0">
              <span className="w-28 shrink-0 text-xs font-bold text-muted">{fmtDateTime(d.scheduledAt)}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{d.fullName}</span>
                <span className="block truncate text-xs text-muted">{[d.patientsPerWeek && `${d.patientsPerWeek} pacientes/sem`, d.painPoint].filter(Boolean).join(" · ") || d.email}</span>
              </span>
              <Badge tone={DEMO_STAGE[d.stage].tone}>{DEMO_STAGE[d.stage].label}</Badge>
              {waLink(d.whatsapp) && <a href={waLink(d.whatsapp, `Hola ${d.fullName.split(" ")[0]}, soy de Ziora. Te escribo por tu demo.`)!} target="_blank" rel="noreferrer" className={btn("ghost", "sm")}>WhatsApp</a>}
              {canEdit && d.scheduledAt && d.scheduledAt.getTime() <= Date.now() && (
                <span className="flex gap-1">
                  <form action={moveDemo.bind(null, d.id, "done")}><button className={btn("secondary", "sm")}>Se hizo</button></form>
                  <form action={moveDemo.bind(null, d.id, "trial")}><button className={btn("secondary", "sm")}>Inició trial</button></form>
                  <form action={moveDemo.bind(null, d.id, "no_show")}><button className={btn("danger", "sm")}>No llegó</button></form>
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <PanelHeader title={`Hoy y atrasados (${dueNow.length})`} />
        <div className="mt-2">
          {dueNow.length === 0 ? <div className="px-5 pb-5"><Empty title="Al día" text="No tienes seguimientos pendientes para hoy." /></div>
            : dueNow.map((f) => <FollowupRow key={f.id} f={f} subject={subject(f)} owner={mineOnly ? undefined : owner(f.ownerId)} canEdit={canEdit} />)}
        </div>
      </Card>

      {later.length > 0 && (
        <Card>
          <PanelHeader title={`Próximos (${later.length})`} />
          <div className="mt-2">{later.map((f) => <FollowupRow key={f.id} f={f} subject={subject(f)} owner={mineOnly ? undefined : owner(f.ownerId)} canEdit={canEdit} />)}</div>
        </Card>
      )}

      {done.length > 0 && (
        <Card>
          <PanelHeader title="Últimos registrados" />
          <div className="mt-2">{done.map((f) => <FollowupRow key={f.id} f={f} subject={subject(f)} owner={mineOnly ? undefined : owner(f.ownerId)} canEdit={false} />)}</div>
        </Card>
      )}
    </div>
  );
}
