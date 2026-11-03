import Link from "next/link";
import { and, asc, gte, isNull, lte } from "drizzle-orm";
import { NewPieceButton, PieceChip, pillarColor } from "@/components/content";
import { btn, Card, cn, PageHeader, PanelHeader, Progress } from "@/components/ui";
import { db } from "@/db";
import { listUsers } from "@/db/queries";
import { contentPieces } from "@/db/schema";
import { todayISO } from "@/lib/format";
import { CONTENT_PILLAR } from "@/lib/labels";

export const dynamic = "force-dynamic";
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const start = new Date(first);
  start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ m?: string; nuevo?: string }> }) {
  const sp = await searchParams;
  const today = todayISO();
  const [y, m] = (sp.m ?? today.slice(0, 7)).split("-").map(Number);
  const cells = monthGrid(y, m - 1);
  const users = await listUsers();
  const [pieces, undated] = await Promise.all([
    db.select().from(contentPieces).where(and(gte(contentPieces.publishOn, cells[0]), lte(contentPieces.publishOn, cells[41]))).orderBy(asc(contentPieces.publishOn)),
    db.select().from(contentPieces).where(isNull(contentPieces.publishOn)).orderBy(asc(contentPieces.createdAt)),
  ]);
  const inMonth = pieces.filter((p) => p.publishOn!.slice(0, 7) === `${y}-${String(m).padStart(2, "0")}` && p.status !== "discarded");
  const edu = inMonth.filter((p) => ["ia_psicoterapia", "estudios", "roi", "psicoterapia_moderna"].includes(p.pillar)).length;
  const memes = inMonth.filter((p) => p.pillar === "memes").length;
  const prod = inMonth.filter((p) => p.pillar === "producto").length;
  const total = inMonth.length || 1;
  const mix = [
    { label: "Educación y datos", value: Math.round((edu / total) * 100), target: 60 },
    { label: "Memes", value: Math.round((memes / total) * 100), target: 25 },
    { label: "Producto", value: Math.round((prod / total) * 100), target: 15 },
  ];
  // Cadencia de la semana actual vs plan (sección 6.1)
  const weekStart = new Date(`${today}T12:00:00Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const ws = weekStart.toISOString().slice(0, 10);
  const we = new Date(weekStart.getTime() + 6 * 86400000).toISOString().slice(0, 10);
  const week = pieces.filter((p) => p.publishOn! >= ws && p.publishOn! <= we && p.status !== "discarded");
  const cadence = [
    { label: "IG posts", value: week.filter((p) => p.channel === "instagram" && p.format !== "reel").length, target: 4 },
    { label: "IG reels", value: week.filter((p) => p.channel === "instagram" && p.format === "reel").length, target: 3 },
    { label: "TikTok", value: week.filter((p) => p.channel === "tiktok").length, target: 3 },
    { label: "Grupos FB", value: week.filter((p) => p.channel === "facebook_group").length, target: 2 },
  ];
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  const monthLabel = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Marketing" title="Calendario de contenido" subtitle="Instagram, TikTok y grupos de Facebook · plan de 90 días" actions={<NewPieceButton users={users} defaultOpen={sp.nuevo === "1"} />} />

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-5">
          <p className="label">Mezcla del mes vs plan (60 / 25 / 15)</p>
          <div className="mt-3 flex flex-col gap-3">
            {mix.map((x) => (
              <div key={x.label} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm">{x.label}</span>
                <Progress value={x.value} max={100} tone={Math.abs(x.value - x.target) <= 10 ? "green" : "amber"} />
                <span className="w-24 shrink-0 whitespace-nowrap text-right text-xs font-semibold text-muted">{x.value}% / {x.target}%</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <p className="label">Cadencia de esta semana</p>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {cadence.map((c) => (
              <div key={c.label}>
                <p className={cn("text-2xl font-extrabold", c.value >= c.target ? "text-emerald" : "")}>{c.value}<span className="text-sm text-faint">/{c.target}</span></p>
                <p className="text-[11px] text-muted">{c.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-lg font-bold">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</h2>
          <div className="flex gap-1.5">
            <Link href={`/content?m=${prev}`} className={btn("ghost", "sm")}>←</Link>
            <Link href="/content" className={btn("ghost", "sm")}>Hoy</Link>
            <Link href={`/content?m=${next}`} className={btn("ghost", "sm")}>→</Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 px-5 pt-3">
          {Object.entries(CONTENT_PILLAR).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 text-[11px] text-muted"><span className="h-2 w-2 rounded-full" style={{ background: pillarColor(k) }} />{v.label}</span>
          ))}
        </div>
        <div className="overflow-x-auto p-5">
          <div className="grid min-w-[760px] grid-cols-7 overflow-hidden rounded-2xl border border-line">
            {DAYS.map((d) => <div key={d} className="border-b border-line bg-[#F7F6F0] px-2 py-1.5 text-center text-[11px] font-bold uppercase text-muted">{d}</div>)}
            {cells.map((date, i) => {
              const dayPieces = pieces.filter((p) => p.publishOn === date);
              const out = date.slice(5, 7) !== String(m).padStart(2, "0");
              return (
                <div key={date} className={cn("min-h-28 border-line p-1.5", i % 7 !== 6 && "border-r", i < 35 && "border-b", out && "bg-[#FAF9F5]")}>
                  <p className={cn("mb-1 text-right text-[11px] font-semibold", date === today ? "ml-auto w-fit rounded-full bg-forest px-1.5 text-white" : out ? "text-faint/60" : "text-faint")}>{Number(date.slice(8))}</p>
                  <div className="flex flex-col gap-1">{dayPieces.map((p) => <PieceChip key={p.id} p={p} users={users} />)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <PanelHeader title="Banco de ideas" subtitle="Piezas sin fecha. Asígnales una para que entren al calendario." />
        <div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {undated.length === 0 && <p className="text-sm text-muted">Sin ideas pendientes.</p>}
          {undated.map((p) => <PieceChip key={p.id} p={p} users={users} full />)}
        </div>
      </Card>
    </div>
  );
}
