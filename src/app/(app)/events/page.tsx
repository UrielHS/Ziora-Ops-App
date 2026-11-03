import Link from "next/link";
import { asc, desc, gte, lt, sql } from "drizzle-orm";
import { CalendarDays, ExternalLink, Mail, MapPin, Users } from "lucide-react";
import { Badge, btn, Card, Empty, PageHeader, PanelHeader } from "@/components/ui";
import { db } from "@/db";
import { events } from "@/db/shared";
import { fmtDate, todayISO } from "@/lib/format";
import { CITY } from "@/lib/labels";

export const dynamic = "force-dynamic";
const STATUS = { idea: ["Idea", "gray"], planning: ["Planeando", "amber"], confirmed: ["Confirmado", "green"], done: ["Realizado", "lilac"], cancelled: ["Cancelado", "red"] } as const;

export default async function EventsPage() {
  const today = todayISO();
  const eventOps = process.env.EVENT_OPS_URL ?? "https://event-ops-845770051786.us-central1.run.app";
  const cols = {
    e: events,
    // Subconsultas con nombres explícitos: dentro de sql`` drizzle no califica columnas y "id" sería ambiguo.
    people: sql<number>`(select count(*)::int from public.event_contacts ec where ec.event_id = "events"."id")`,
    psych: sql<number>`(select count(*)::int from public.event_contacts ec join public.contact_tags t on t.contact_id = ec.contact_id and t.tag = 'psychologist' where ec.event_id = "events"."id")`,
  };
  const [upcoming, past] = await Promise.all([
    db.select(cols).from(events).where(gte(events.date, today)).orderBy(asc(events.date)),
    db.select(cols).from(events).where(lt(events.date, today)).orderBy(desc(events.date)).limit(8),
  ]);

  const Item = ({ r }: { r: (typeof upcoming)[number] }) => {
    const [label, tone] = STATUS[r.e.status];
    return (
      <div className="flex flex-col gap-3 border-b border-[#EFEDE6] px-5 py-4 last:border-b-0 md:flex-row md:items-center">
        <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-mint py-1.5 text-emerald">
          <span className="text-[10px] font-bold uppercase">{fmtDate(r.e.date, { month: "short" })}</span>
          <span className="text-xl font-extrabold leading-none">{r.e.date ? Number(r.e.date.slice(8)) : "?"}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{r.e.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{CITY[r.e.city]}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{r.people} personas · {r.psych} psicólogos</span>
          </p>
        </div>
        <Badge tone={tone}>{label}</Badge>
        <div className="flex gap-2">
          {r.e.date && r.e.date >= today && <Link href={`/campaigns/new?event=${r.e.id}`} className={btn("secondary", "sm")}><Mail className="h-3.5 w-3.5" />Invitar por correo</Link>}
          <a href={`${eventOps}/events/${r.e.id}`} target="_blank" className={btn("ghost", "sm")}>Event Ops <ExternalLink className="h-3 w-3" /></a>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Marketing · desde Event Ops" title="Eventos" subtitle="Solo lectura: los eventos se administran en Event Ops. Desde aquí invitas a la base de psicólogos." actions={<a href={eventOps} target="_blank" className={btn("ghost")}><CalendarDays className="h-4 w-4" />Abrir Event Ops</a>} />
      <Card>
        <PanelHeader title="Próximos" />
        <div className="mt-2">
          {upcoming.length === 0 ? <div className="p-5"><Empty title="Sin eventos próximos" text="Cuando se creen en Event Ops aparecerán aquí." /></div> : upcoming.map((r) => <Item key={r.e.id} r={r} />)}
        </div>
      </Card>
      {past.length > 0 && (
        <Card>
          <PanelHeader title="Recientes" />
          <div className="mt-2">{past.map((r) => <Item key={r.e.id} r={r} />)}</div>
        </Card>
      )}
    </div>
  );
}
