import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { MobileNav, Sidebar } from "@/components/sidebar";
import { btn, inputCls } from "@/components/ui";
import { navCounts } from "@/db/queries";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, counts] = await Promise.all([requireUser(), navCounts()]);
  return (
    <div className="flex min-h-screen">
      <Sidebar user={{ name: user.name, role: user.role }} counts={counts} />
      <div className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-6 md:pb-8">
        <div className="mb-5 flex items-center gap-3">
          <form action="/search" className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input name="q" placeholder="Buscar tareas, contactos, demos, bugs…" className={`${inputCls} rounded-full pl-9`} />
          </form>
          <details className="relative ml-auto">
            <summary className={`${btn("primary")} list-none`}>
              <Plus className="h-4 w-4" /> Nuevo
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-lg">
              {[
                ["/tasks?nuevo=1", "Tarea"], ["/demos?nuevo=1", "Demo"], ["/bugs?nuevo=1", "Bug"],
                ["/contacts?nuevo=1", "Contacto"], ["/content?nuevo=1", "Pieza de contenido"], ["/campaigns/new", "Campaña"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="block px-4 py-2 text-sm hover:bg-mint">{label}</Link>
              ))}
            </div>
          </details>
        </div>
        {children}
      </div>
      <MobileNav />
    </div>
  );
}
