"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { epics, sprints, tasks, taskStatusEnum, priorityEnum } from "@/db/schema";
import { formAction, type ActionState } from "@/lib/action";
import { requireUser } from "@/lib/session";

const taskFields = z.object({
  title: z.string().trim().min(2, "escribe un título").max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(taskStatusEnum.enumValues).default("todo"),
  priority: z.enum(priorityEnum.enumValues).default("medium"),
  epicId: z.uuid().optional(),
  sprintId: z.uuid().optional(),
  assigneeId: z.uuid().optional(),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  blocker: z.literal("on").optional(),
  labels: z.string().max(200).optional(),
});

function toRow(d: z.infer<typeof taskFields>) {
  return {
    title: d.title,
    description: d.description ?? null,
    status: d.status,
    priority: d.priority,
    epicId: d.epicId ?? null,
    sprintId: d.sprintId ?? null,
    assigneeId: d.assigneeId ?? null,
    dueOn: d.dueOn ?? null,
    blocker: d.blocker === "on",
    labels: d.labels ? d.labels.split(",").map((l) => l.trim()).filter(Boolean) : [],
  };
}

const _createTask = formAction(taskFields, async (d) => {
  const user = await requireUser();
  const [t] = await db.insert(tasks).values({ ...toRow(d), reporterId: user.id }).returning({ number: tasks.number });
  revalidatePath("/", "layout");
  return `ZOP-${t.number} creada`;
});

const _updateTask = formAction(taskFields.extend({ id: z.uuid() }), async ({ id, ...d }) => {
  await requireUser();
  await db.update(tasks).set(toRow(d)).where(eq(tasks.id, id));
  revalidatePath("/", "layout");
});

export async function moveTask(id: string, status: string) {
  await requireUser();
  const s = z.enum(taskStatusEnum.enumValues).parse(status);
  await db.update(tasks).set({ status: s }).where(eq(tasks.id, id));
  revalidatePath("/", "layout");
}

export async function deleteTask(fd: FormData) {
  await requireUser();
  await db.delete(tasks).where(eq(tasks.id, z.uuid().parse(fd.get("id"))));
  revalidatePath("/", "layout");
}

const _createSprint = formAction(
  z.object({
    name: z.string().trim().min(2).max(100),
    goal: z.string().max(500).optional(),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha de inicio"),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha de fin"),
  }),
  async (d) => {
    await requireUser();
    await db.insert(sprints).values(d);
    revalidatePath("/tasks");
  },
);

export async function activateSprint(fd: FormData) {
  await requireUser();
  const id = z.uuid().parse(fd.get("id"));
  await db.transaction(async (tx) => {
    await tx.update(sprints).set({ status: "closed" }).where(eq(sprints.status, "active"));
    await tx.update(sprints).set({ status: "active" }).where(eq(sprints.id, id));
  });
  revalidatePath("/", "layout");
}

const _createEpic = formAction(
  z.object({
    key: z.string().trim().toUpperCase().regex(/^[A-Z]{2,8}$/, "clave de 2 a 8 letras"),
    name: z.string().trim().min(2).max(60),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#4E6B5C"),
  }),
  async (d) => {
    await requireUser();
    await db.insert(epics).values(d).onConflictDoNothing();
    revalidatePath("/", "layout");
  },
);

// Next exige que cada export de un archivo "use server" sea una función async declarada.
export async function createTask(prev: ActionState, fd: FormData) {
  return _createTask(prev, fd);
}
export async function updateTask(prev: ActionState, fd: FormData) {
  return _updateTask(prev, fd);
}
export async function createSprint(prev: ActionState, fd: FormData) {
  return _createSprint(prev, fd);
}
export async function createEpic(prev: ActionState, fd: FormData) {
  return _createEpic(prev, fd);
}
