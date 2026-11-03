import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Check, CircleDashed, ExternalLink, GitMerge, GitPullRequest, X } from "lucide-react";
import { syncPrs } from "@/actions/prs";
import { Badge, Card, cn, PageHeader } from "@/components/ui";
import { ActionForm, Submit } from "@/components/ui/form";
import { db } from "@/db";
import { pullRequests, prStateEnum } from "@/db/schema";
import { relative } from "@/lib/format";
import { PR_STATE } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function PullRequestsPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const sp = await searchParams;
  const state = (prStateEnum.enumValues as readonly string[]).includes(sp.state ?? "") ? (sp.state as "open") : sp.state === "all" ? null : "open";
  const rows = await db.select().from(pullRequests).where(state ? eq(pullRequests.state, state) : undefined).orderBy(desc(pullRequests.ghUpdatedAt));
  const all = await db.select({ state: pullRequests.state, review: pullRequests.reviewState, checks: pullRequests.checksState, draft: pullRequests.draft, mergedAt: pullRequests.mergedAt }).from(pullRequests);
  const open = all.filter((p) => p.state === "open");
  const weekAgo = Date.now() - 7 * 86400000;
  const repos = [...new Set(rows.map((r) => r.repo))];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Producto"
        title="Pull requests"
        subtitle="Se actualizan en tiempo real con el webhook de GitHub y se resincronizan cada 30 min."
        actions={
          <ActionForm action={syncPrs} className="flex items-center gap-2">
            <Submit variant="ghost">Sincronizar ahora</Submit>
          </ActionForm>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Abiertos", open.length, "En todos los repos"],
          ["Esperan revisión", open.filter((p) => !p.draft && p.review !== "approved").length, "Sin aprobación"],
          ["CI fallando", open.filter((p) => p.checks === "failure").length, "Checks en rojo"],
          ["Merged esta semana", all.filter((p) => p.mergedAt && p.mergedAt.getTime() > weekAgo).length, "Últimos 7 días"],
        ].map(([l, v, n]) => (
          <div key={l as string} className={cn("card p-4", l === "CI fallando" && (v as number) > 0 && "border-danger/40")}>
            <p className="label">{l}</p>
            <p className="mt-1 text-2xl font-extrabold">{v}</p>
            <p className="text-[11px] text-muted">{n}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {[["open", "Abiertos"], ["merged", "Merged"], ["closed", "Cerrados"], ["all", "Todos"]].map(([k, l]) => (
          <Link key={k} href={`/pull-requests?state=${k}`} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", (state ?? "all") === k ? "bg-mint text-emerald" : "border border-line bg-white text-muted")}>{l}</Link>
        ))}
      </div>
      {repos.length === 0 && <Card className="p-6 text-sm text-muted">No hay PRs en este filtro.</Card>}
      {repos.map((repo) => (
        <Card key={repo}>
          <p className="border-b border-line px-5 py-3 text-sm font-bold"><GitPullRequest className="mr-1.5 inline h-4 w-4 text-muted" />{repo}</p>
          {rows.filter((r) => r.repo === repo).map((p) => (
            <a key={p.id} href={p.url} target="_blank" className="flex items-center gap-3 border-b border-[#EFEDE6] px-5 py-3 last:border-b-0 hover:bg-[#FBFAF6]">
              {p.state === "merged" ? <GitMerge className="h-4 w-4 text-[#6B4FA8]" /> : <GitPullRequest className={cn("h-4 w-4", p.state === "open" ? "text-emerald" : "text-faint")} />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">#{p.number} {p.title}</span>
                <span className="block text-xs text-muted">{p.author} · {p.headRef} → {p.baseRef} · actualizado {relative(p.ghUpdatedAt)}</span>
              </span>
              {p.draft && <Badge>Draft</Badge>}
              {p.state === "open" && !p.draft && (
                <Badge tone={p.reviewState === "approved" ? "green" : p.reviewState === "changes_requested" ? "red" : "amber"}>
                  {p.reviewState === "approved" ? "Aprobado" : p.reviewState === "changes_requested" ? "Cambios pedidos" : "En revisión"}
                </Badge>
              )}
              {p.state !== "open" && <Badge tone={PR_STATE[p.state].tone}>{PR_STATE[p.state].label}</Badge>}
              <span title={`CI: ${p.checksState ?? "sin datos"}`}>
                {p.checksState === "success" ? <Check className="h-4 w-4 text-emerald" /> : p.checksState === "failure" ? <X className="h-4 w-4 text-danger" /> : <CircleDashed className="h-4 w-4 text-faint" />}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-faint" />
            </a>
          ))}
        </Card>
      ))}
    </div>
  );
}
