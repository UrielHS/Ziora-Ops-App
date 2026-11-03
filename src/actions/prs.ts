"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { syncOpenPullRequests } from "@/integrations/github";
import type { ActionState } from "@/lib/action";
import { requireUser } from "@/lib/session";

export async function syncPrs(_prev: ActionState): Promise<ActionState> {
  await requireUser();
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOS) {
    return { error: "Falta configurar GITHUB_TOKEN y GITHUB_REPOS (ver Ajustes → Integraciones)." };
  }
  try {
    const n = await syncOpenPullRequests(db);
    revalidatePath("/", "layout");
    return { ok: true, message: `${n} PRs abiertos sincronizados` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo sincronizar" };
  }
}
