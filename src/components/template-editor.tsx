"use client";

import { useMemo, useRef, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { saveTemplate } from "@/actions/campaigns";
import { Field, inputCls, cn } from "@/components/ui";
import { ActionForm, Submit } from "@/components/ui/form";
import { renderTemplate } from "@/domain/template";

const VARS: [string, string][] = [
  ["{{nombre}}", "Primer nombre"], ["{{nombre_completo}}", "Nombre completo"], ["{{ciudad}}", "Ciudad"],
  ["{{evento}}", "Evento"], ["{{evento_fecha}}", "Fecha del evento"], ["{{{evento_registro}}}", "Link de registro"], ["{{{baja}}}", "Link de baja (obligatorio)"],
];
const SAMPLE = {
  nombre: "Andrea", nombre_completo: "Psic. Andrea Ruiz", ciudad: "cdmx", evento: "Demo Night · Ziora Founders",
  evento_fecha: "2026-10-26", evento_registro: "https://lu.ma/ejemplo", baja: "#baja",
};

export function TemplateEditor({ t }: { t?: { id: string; name: string; subject: string; previewText: string | null; html: string } }) {
  const [html, setHtml] = useState(t?.html ?? STARTER);
  const [subject, setSubject] = useState(t?.subject ?? "{{nombre}}, te invitamos a {{evento}}");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const ta = useRef<HTMLTextAreaElement>(null);
  const preview = useMemo(() => renderTemplate(html, SAMPLE), [html]);

  function insert(v: string) {
    const el = ta.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const next = html.slice(0, s) + v + html.slice(e);
    setHtml(next);
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = s + v.length; });
  }

  return (
    <ActionForm action={saveTemplate} className="grid gap-5 xl:grid-cols-2">
      <div className="flex flex-col gap-4">
        {t && <input type="hidden" name="id" value={t.id} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre interno"><input name="name" required defaultValue={t?.name} className={inputCls} placeholder="Invitación a evento" /></Field>
          <Field label="Texto de vista previa"><input name="previewText" defaultValue={t?.previewText ?? ""} className={inputCls} placeholder="Lo que se ve junto al asunto" /></Field>
        </div>
        <Field label="Asunto"><input name="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} /></Field>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted">Variables (clic para insertar)</p>
          <div className="flex flex-wrap gap-1.5">
            {VARS.map(([v, l]) => (
              <button key={v} type="button" onClick={() => insert(v)} className={cn("pill border border-line bg-white text-muted hover:border-emerald/40 hover:text-emerald", v.includes("baja") && "border-emerald/40 text-emerald")}>{l}</button>
            ))}
          </div>
        </div>
        <Field label="HTML" hint="{{var}} se escapa; {{{var}}} inserta sin escapar (solo para enlaces). Usa estilos en línea: los clientes de correo ignoran <style> externos.">
          <textarea ref={ta} name="html" value={html} onChange={(e) => setHtml(e.target.value)} spellCheck={false} rows={22} className={cn(inputCls, "font-mono text-[12px] leading-relaxed")} />
        </Field>
        <Submit>Guardar plantilla</Submit>
      </div>
      <div className="flex flex-col gap-2 xl:sticky xl:top-4 xl:self-start">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted">Vista previa con datos de ejemplo</p>
          <div className="flex rounded-full border border-line bg-white p-0.5">
            {([["desktop", Monitor], ["mobile", Smartphone]] as const).map(([d, Icon]) => (
              <button key={d} type="button" onClick={() => setDevice(d)} className={cn("rounded-full p-1.5", device === d ? "bg-mint text-emerald" : "text-muted")}><Icon className="h-4 w-4" /></button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-3">
          <p className="text-[11px] text-faint">Asunto</p>
          <p className="text-sm font-bold">{renderTemplate(subject, SAMPLE).replace(/&amp;/g, "&")}</p>
        </div>
        <div className="flex justify-center rounded-2xl border border-line bg-[#EDEBE3] p-4">
          <iframe title="preview" sandbox="" srcDoc={preview} className={cn("h-[640px] rounded-xl border-0 bg-white shadow-sm transition-all", device === "desktop" ? "w-full" : "w-[375px]")} />
        </div>
      </div>
    </ActionForm>
  );
}

export const STARTER = `<!doctype html>
<html lang="es"><body style="margin:0;background:#F7F6F0;font-family:Arial,Helvetica,sans-serif;color:#1A2520">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6F0;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #E7E5DC">
        <tr><td style="background:linear-gradient(120deg,#B9EED0,#C8F1EA);padding:28px 32px">
          <p style="margin:0;font-size:20px;font-weight:800;color:#1F4A45">Ziora</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 12px;font-size:22px;font-weight:800">Hola, {{nombre | colega}}</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4B5563">Escribe aquí tu mensaje.</p>
          <a href="https://www.ziora-copilot.com" style="display:inline-block;background:#4E6B5C;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">Conoce Ziora</a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #EFEDE6;font-size:11px;color:#9CA3AF">
          Recibes este correo porque aceptaste noticias de Ziora. <a href="{{{baja}}}" style="color:#9CA3AF">Darme de baja</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
