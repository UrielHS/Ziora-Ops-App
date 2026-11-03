import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

export type ActionState = { ok?: boolean; error?: string; message?: string };

/** Envuelve una server action: valida con zod y convierte errores en mensajes para el formulario. */
export function formAction<S extends z.ZodType>(schema: S, fn: (data: z.infer<S>) => Promise<string | void>) {
  return async (_prev: ActionState, fd: FormData): Promise<ActionState> => {
    const raw: Record<string, unknown> = {};
    for (const [k, v] of fd.entries()) {
      if (k.startsWith("$ACTION")) continue;
      if (k.endsWith("[]")) {
        const key = k.slice(0, -2);
        raw[key] = [...((raw[key] as string[]) ?? []), v];
      } else raw[k] = v === "" ? undefined : v;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { error: `${issue.path.join(".") || "Formulario"}: ${issue.message}` };
    }
    try {
      const message = await fn(parsed.data);
      return { ok: true, message: message ?? undefined };
    } catch (err) {
      unstable_rethrow(err); // deja pasar redirect() y notFound()
      console.error(err);
      return { error: err instanceof Error ? err.message : "Algo salió mal" };
    }
  };
}

export const optionalId = z.string().uuid().optional();
