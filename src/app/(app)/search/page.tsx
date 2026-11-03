import Link from "next/link";
import { ilike, or } from "drizzle-orm";
import { Badge, Card, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { bugs, demoRequests, tasks } from "@/db/schema";
import { contacts } from "@/db/shared";
import { BUG_STATUS, DEMO_STAGE, TASK_STATUS } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.trim() ?? "";
  const like = `%${q}%`;
  const [t, c, d, b] = q.length < 2 ? [[], [], [], []] : await Promise.all([
    db.select().from(tasks).where(or(ilike(tasks.title, like), ilike(tasks.description, like))).limit(10),
    db.select().from(contacts).where(or(ilike(contacts.name, like), ilike(contacts.email, like))).limit(10),
    db.select().from(demoRequests).where(or(ilike(demoRequests.fullName, like), ilike(demoRequests.email, like))).limit(10),
    db.select().from(bugs).where(ilike(bugs.title, like)).limit(10),
  ]);
  const groups = [
    { title: "Tareas", href: "/tasks?sprint=all", items: t.map((x) => ({ id: x.id, l: `ZOP-${x.number} · ${x.title}`, badge: TASK_STATUS[x.status] })) },
    { title: "Contactos", href: "/contacts", items: c.map((x) => ({ id: x.id, l: `${x.name} · ${x.email ?? ""}`, badge: null })) },
    { title: "Demos", href: "/demos", items: d.map((x) => ({ id: x.id, l: x.fullName, badge: DEMO_STAGE[x.stage] })) },
    { title: "Bugs", href: "/bugs?show=all", items: b.map((x) => ({ id: x.id, l: `BUG-${x.number} · ${x.title}`, badge: BUG_STATUS[x.status] })) },
  ];
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={q ? `Resultados para “${q}”` : "Buscar"} subtitle={q.length < 2 ? "Escribe al menos 2 letras en la barra de búsqueda." : undefined} />
      {groups.filter((g) => g.items.length).map((g) => (
        <Card key={g.title}>
          <p className="label px-5 pt-4">{g.title}</p>
          <div className="mt-1">
            {g.items.map((i) => (
              <Link key={i.id} href={`${g.href}${g.href.includes("?") ? "&" : "?"}q=${encodeURIComponent(q)}`} className="flex items-center justify-between gap-3 border-b border-[#EFEDE6] px-5 py-2.5 text-sm last:border-b-0 hover:bg-[#FBFAF6]">
                <span className="truncate">{i.l}</span>{i.badge && <Badge tone={i.badge.tone}>{i.badge.label}</Badge>}
              </Link>
            ))}
          </div>
        </Card>
      ))}
      {q.length >= 2 && groups.every((g) => g.items.length === 0) && <Card className="p-6 text-sm text-muted">Sin resultados.</Card>}
    </div>
  );
}
