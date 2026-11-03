/**
 * Plantillas HTML con variables {{nombre}}. Los valores se escapan siempre;
 * {{{var}}} inserta HTML sin escapar (solo para variables generadas por el sistema, ej. enlaces).
 */
const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

export type TemplateVars = Record<string, string | number | null | undefined>;

export function renderTemplate(tpl: string, vars: TemplateVars): string {
  return tpl
    .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, k: string) => String(vars[k] ?? ""))
    .replace(/\{\{\s*([\w.]+)\s*(?:\|\s*([^}]*?)\s*)?\}\}/g, (_, k: string, fallback?: string) => {
      const v = vars[k];
      return escapeHtml(v === null || v === undefined || v === "" ? (fallback ?? "") : String(v));
    });
}

export function templateVariables(tpl: string): string[] {
  const found = new Set<string>();
  for (const m of tpl.matchAll(/\{\{\{?\s*([\w.]+)/g)) found.add(m[1]);
  return [...found];
}

export function firstName(fullName: string): string {
  return fullName.trim().replace(/^(psic\.?|dra?\.?|lic\.?|mtr[ao]\.?)\s+/i, "").split(/\s+/)[0] ?? "";
}
