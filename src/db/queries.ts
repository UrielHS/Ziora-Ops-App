import { and, asc, count, eq, inArray, ne } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { bugs, contentPieces, contentSuggestions, demoRequests, epics, pullRequests, sprints, tasks } from "@/db/schema";
import { users } from "@/db/shared";

export const listUsers = cache(() =>
  db.select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active })
    .from(users).where(eq(users.active, true)).orderBy(asc(users.name)),
);

export const listEpics = cache(() => db.select().from(epics).orderBy(asc(epics.key)));

export const listSprints = cache(() => db.select().from(sprints).orderBy(asc(sprints.startsOn)));

export const activeSprint = cache(async () => {
  const [s] = await db.select().from(sprints).where(eq(sprints.status, "active")).limit(1);
  return s ?? null;
});

export const navCounts = cache(async () => {
  const [[t], [d], [b], [p], [r], [sg]] = await Promise.all([
    db.select({ n: count() }).from(tasks).where(and(ne(tasks.status, "done"), ne(tasks.status, "backlog"))),
    db.select({ n: count() }).from(demoRequests).where(inArray(demoRequests.stage, ["requested", "scheduled"])),
    db.select({ n: count() }).from(bugs).where(inArray(bugs.status, ["new", "triaged", "in_progress"])),
    db.select({ n: count() }).from(pullRequests).where(eq(pullRequests.state, "open")),
    db.select({ n: count() }).from(contentPieces).where(eq(contentPieces.status, "legal_review")),
    db.select({ n: count() }).from(contentSuggestions).where(eq(contentSuggestions.status, "new")),
  ]);
  return { tasks: t.n, demos: d.n, bugs: b.n, prs: p.n, reviews: r.n, suggestions: sg.n };
});

export type UserOption = Awaited<ReturnType<typeof listUsers>>[number];
export const userOptions = (us: UserOption[]) => us.map((u) => [u.id, u.name] as [string, string]);
