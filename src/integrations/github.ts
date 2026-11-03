import { Octokit } from "@octokit/rest";
import type { Db } from "@/db";
import { pullRequests } from "@/db/schema";
import { requireEnv } from "@/lib/env";

export function repos(): string[] {
  return (process.env.GITHUB_REPOS ?? "").split(",").map((r) => r.trim()).filter(Boolean);
}

type PrPayload = {
  number: number;
  title: string;
  html_url: string;
  draft?: boolean;
  state: string;
  merged_at: string | null;
  created_at: string;
  updated_at: string;
  user: { login: string } | null;
  head: { ref: string; sha: string };
  base: { ref: string };
};

export async function upsertPr(db: Db, repo: string, pr: PrPayload, extra?: { reviewState?: string; checksState?: string }) {
  const values = {
    repo,
    number: pr.number,
    title: pr.title,
    author: pr.user?.login ?? "unknown",
    state: (pr.merged_at ? "merged" : pr.state === "open" ? "open" : "closed") as "open" | "closed" | "merged",
    draft: pr.draft ?? false,
    url: pr.html_url,
    headRef: pr.head.ref,
    baseRef: pr.base.ref,
    openedAt: new Date(pr.created_at),
    ghUpdatedAt: new Date(pr.updated_at),
    mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
    ...(extra?.reviewState ? { reviewState: extra.reviewState } : {}),
    ...(extra?.checksState ? { checksState: extra.checksState } : {}),
  };
  await db
    .insert(pullRequests)
    .values(values)
    .onConflictDoUpdate({ target: [pullRequests.repo, pullRequests.number], set: values });
}

/** Sincronización completa de PRs abiertos (job periódico; los webhooks cubren el tiempo real). */
export async function syncOpenPullRequests(db: Db) {
  const gh = new Octokit({ auth: requireEnv("GITHUB_TOKEN") });
  let count = 0;
  for (const full of repos()) {
    const [owner, repo] = full.split("/");
    const prs = await gh.paginate(gh.pulls.list, { owner, repo, state: "open", per_page: 100 });
    for (const pr of prs) {
      const [reviews, checks] = await Promise.all([
        gh.pulls.listReviews({ owner, repo, pull_number: pr.number, per_page: 100 }),
        gh.checks.listForRef({ owner, repo, ref: pr.head.sha, per_page: 100 }).catch(() => null),
      ]);
      const last = reviews.data.filter((r) => r.state !== "COMMENTED").at(-1);
      const reviewState = last?.state === "APPROVED" ? "approved" : last?.state === "CHANGES_REQUESTED" ? "changes_requested" : "pending";
      const runs = checks?.data.check_runs ?? [];
      const checksState = runs.length === 0
        ? "none"
        : runs.some((r) => r.conclusion === "failure" || r.conclusion === "timed_out")
          ? "failure"
          : runs.every((r) => r.status === "completed")
            ? "success"
            : "pending";
      await upsertPr(db, full, pr as unknown as PrPayload, { reviewState, checksState });
      count++;
    }
  }
  return count;
}
