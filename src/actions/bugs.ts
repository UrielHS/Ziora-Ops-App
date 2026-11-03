"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { bugs, bugSeverityEnum, bugStatusEnum, tasks } from "@/db/schema";
import { formAction, type ActionState } from "@/lib/action";
import { requireUser } from "@/lib/session";

const _createBug = formAction(
  z.object({
    title: z.string().trim().min(3).max(200),
    severity: z.enum(bugSeverityEnum.enumValues),
    area: z.string().max(80).optional(),
    environment: z.string().max(40).default("production"),
    device: z.string().max(200).optional(),
    stepsToReproduce: z.string().max(5000).optional(),
    expected: z.string().max(2000).optional(),
    actual: z.string().max(2000).optional(),
    assigneeId: z.uuid().optional(),
  }),
  async (d) => {
    const user = await requireUser();
    const [b] = await db.insert(bugs).values({ ...d, reporterId: user.id, reporterEmail: user.email, source: "manual" }).returning({ n: bugs.number });
    revalidatePath("/", "layout");
    return `BUG-${b.n} registrado`;
  },
);

const _updateBug = formAction(
  z.object({
    id: z.uuid(),
    status: z.enum(bugStatusEnum.enumValues),
    severity: z.enum(bugSeverityEnum.enumValues),
    assigneeId: z.uuid().optional(),
    prUrl: z.url().optional(),
    area: z.string().max(80).optional(),
  }),
  async ({ id, ...d }) => {
    await requireUser();
    await db.update(bugs).set({ ...d, assigneeId: d.assigneeId ?? null, prUrl: d.prUrl ?? null }).where(eq(bugs.id, id));
    revalidatePath("/", "layout");
  },
);

export async function setBugStatus(fd: FormData) {
  await requireUser();
  await db.update(bugs).set({ status: z.enum(bugStatusEnum.enumValues).parse(fd.get("status")) }).where(eq(bugs.id, z.uuid().parse(fd.get("id"))));
  revalidatePath("/", "layout");
}

export async function bugToTask(fd: FormData) {
  const user = await requireUser();
  const [b] = await db.select().from(bugs).where(eq(bugs.id, z.uuid().parse(fd.get("id"))));
  if (!b) return;
  await db.insert(tasks).values({
    title: `BUG-${b.number}: ${b.title}`, status: "todo", bugId: b.id, reporterId: user.id, assigneeId: b.assigneeId,
    priority: b.severity === "critical" ? "urgent" : b.severity === "high" ? "high" : "medium",
    blocker: b.severity === "critical", labels: ["qa"],
  });
  await db.update(bugs).set({ status: b.status === "new" ? "triaged" : b.status }).where(eq(bugs.id, b.id));
  revalidatePath("/", "layout");
}

// Next exige que cada export de un archivo "use server" sea una función async declarada.
export async function createBug(prev: ActionState, fd: FormData) {
  return _createBug(prev, fd);
}
export async function updateBug(prev: ActionState, fd: FormData) {
  return _updateBug(prev, fd);
}
