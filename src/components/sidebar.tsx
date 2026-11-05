"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3, BookOpen, Building2, Bug, ChevronDown, HeartPulse, PhoneCall, CalendarDays, ClipboardCheck, Lightbulb, CheckSquare, FileCode2, GitPullRequest, LayoutDashboard, LineChart, Link2, Mail, Megaphone, Settings, Target, Ticket, Users, Video,
} from "lucide-react";
import { Avatar, cn } from "@/components/ui";
import { can, type Access, type Permission } from "@/lib/permissions";

const NAV_KEY = "ziora-ops.nav-abierta";
const GUIDE_URL = "https://claude.ai/artifact/MuA3uW7R56AbWaQeWx2fGF";

type Item = {
  href: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  shared?: boolean; count?: number; perm?: Permission;
};

export function Sidebar({
  user, counts, access,
}: { user: { name: string; roleLabel: string }; counts: Record<string, number>; access: Access }) {
  const path = usePathname();
  const all: { label: string; items: Item[] }[] = [
    { label: "Operación", items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/tasks", label: "Tareas", icon: CheckSquare, count: counts.tasks },
    ] },
    { label: "Ventas", items: [
      { href: "/sales", label: "Cuentas y contratos", icon: Building2, perm: "sales.view" },
      { href: "/demos", label: "Demos", icon: Video, count: counts.demos },
      { href: "/contacts", label: "Contactos", icon: Users },
    ] },
    { label: "Clientes", items: [
      { href: "/customers", label: "Usuarios de Ziora", icon: HeartPulse, perm: "customers.view" },
      { href: "/followups", label: "Seguimiento 1:1", icon: PhoneCall, count: counts.followups, perm: "followups.manage" },
    ] },
    { label: "Marketing", items: [
      { href: "/content", label: "Contenido", icon: Megaphone },
      { href: "/content/review", label: "Revisión", icon: ClipboardCheck, count: counts.reviews },
      { href: "/content/suggestions", label: "Sugerencias", icon: Lightbulb, count: counts.suggestions },
      { href: "/social", label: "Redes sociales", icon: BarChart3, perm: "analytics.view" },
      { href: "/ads", label: "Anuncios", icon: Target, perm: "analytics.view" },
      { href: "/campaigns", label: "Correo masivo", icon: Mail },
      { href: "/templates", label: "Plantillas", icon: FileCode2 },
      { href: "/events", label: "Eventos", icon: CalendarDays, shared: true },
    ] },
    { label: "Producto", items: [
      { href: "/tickets", label: "Tickets", icon: Ticket, count: counts.tickets },
      { href: "/bugs", label: "QA y bugs", icon: Bug, count: counts.bugs },
      { href: "/pull-requests", label: "Pull requests", icon: GitPullRequest, count: counts.prs },
    ] },
    { label: "", items: [
      { href: "/metrics", label: "Métricas", icon: LineChart },
      { href: "/settings", label: "Ajustes", icon: Settings },
    ] },
  ];
  // Sin roles asignados todavía: se ve todo lo que no exige permiso (Ajustes → Equipo los asigna).
  const groups = all
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || can(access, i.perm)) }))
    .filter((g) => g.items.length > 0);
  // La ruta más específica gana: en /content/review se marca "Revisión", no "Contenido".
  const hrefs = all.flatMap((g) => g.items.map((i) => i.href));
  const isActive = (href: string) =>
    (path === href || path.startsWith(`${href}/`)) && !hrefs.some((h) => h.length > href.length && (path === h || path.startsWith(`${h}/`)));

  // Grupos plegables: el de la página actual siempre abierto; los demás, como los dejó la persona.
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try { setOpen(JSON.parse(localStorage.getItem(NAV_KEY) ?? "{}")); } catch { /* sin almacenamiento: todo plegado */ }
  }, []);
  const toggle = (label: string, now: boolean) => {
    const next = { ...open, [label]: !now };
    setOpen(next);
    try { localStorage.setItem(NAV_KEY, JSON.stringify(next)); } catch { /* no se recuerda, pero funciona */ }
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto px-3 py-5 md:flex">
      <Link href="/dashboard" className="flex items-center gap-2 px-3 pb-5">
        <Logo />
        <span className="text-[19px] font-extrabold tracking-tight text-teal">Ziora</span>
        <span className="text-[19px] font-medium text-faint">Ops</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {groups.map((g, gi) => {
          const hasActive = g.items.some((i) => isActive(i.href));
          const isOpen = !g.label || hasActive || !!open[g.label];
          const pending = g.items.reduce((n, i) => n + (i.count ?? 0), 0);
          return (
            <div key={gi} className={cn("flex flex-col gap-0.5", !g.label && "mt-3")}>
              {g.label && (
                <button
                  type="button"
                  onClick={() => !hasActive && toggle(g.label, isOpen)}
                  aria-expanded={isOpen}
                  title={hasActive ? "Aquí está la página abierta" : isOpen ? "Ocultar sección" : "Mostrar sección"}
                  className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-left hover:bg-white", hasActive && "cursor-default hover:bg-transparent")}
                >
                  <span className="label flex-1">{g.label}</span>
                  {!isOpen && pending > 0 && (
                    <span className="rounded-full bg-[#ECEAE2] px-1.5 text-[10px] font-bold text-muted">{pending}</span>
                  )}
                  <ChevronDown className={cn("h-3.5 w-3.5 text-faint transition-transform", !isOpen && "-rotate-90")} strokeWidth={1.8} />
                </button>
              )}
              {isOpen && g.items.map(({ href, label, icon: Icon, shared, count }) => {
                const on = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={on ? "page" : undefined}
                    title={shared ? "Datos compartidos con Event Ops" : undefined}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-full px-3 py-[7px] text-[13.5px] transition-colors",
                      on ? "bg-mint font-semibold text-emerald" : "text-muted hover:bg-white hover:text-ink",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                    <span className="flex-1">{label}</span>
                    {shared && <Link2 className="h-3.5 w-3.5 text-faint" strokeWidth={1.6} />}
                    {!!count && (
                      <span className={cn("rounded-full px-1.5 text-[10px] font-bold", on ? "bg-white text-emerald" : "bg-[#ECEAE2] text-muted")}>{count}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <a
        href={GUIDE_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Cómo usar Ziora Ops: qué registrar, dónde y cuándo"
        className="mt-auto mb-3 flex items-center gap-2.5 rounded-full px-3 py-[7px] text-[13.5px] text-muted transition-colors hover:bg-white hover:text-ink"
      >
        <BookOpen className="h-4 w-4 shrink-0" strokeWidth={1.6} />
        <span className="flex-1">Guía de uso</span>
        <span className="text-[11px] text-faint" aria-hidden>↗</span>
      </a>
      <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-white px-3 py-2.5">
        <Avatar name={user.name} size={30} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-[11px] text-faint">{user.roleLabel}</p>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const path = usePathname();
  const items = [
    { href: "/dashboard", icon: LayoutDashboard }, { href: "/tasks", icon: CheckSquare }, { href: "/demos", icon: Video },
    { href: "/contacts", icon: Users }, { href: "/campaigns", icon: Mail }, { href: "/bugs", icon: Bug },
  ];
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-full border border-line bg-white/95 p-1.5 shadow-sm backdrop-blur md:hidden">
      {items.map(({ href, icon: Icon }) => (
        <Link key={href} href={href} className={cn("rounded-full p-2.5", path.startsWith(href) ? "bg-mint text-emerald" : "text-muted")}>
          <Icon className="h-5 w-5" strokeWidth={1.6} />
        </Link>
      ))}
    </nav>
  );
}

/** Pájaro estilizado (martín pescador) inspirado en el logo de Ziora. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M5 26c0-9 6-16 14-16 3 0 5 1 6 2l-4 2c3 1 5 4 5 7 0 3-2 5-5 5H5Z" fill="#1F4A45" />
      <path d="M19 10 23 3l1 8" stroke="#1F4A45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="15" r="1.4" fill="#F7F6F0" />
    </svg>
  );
}
