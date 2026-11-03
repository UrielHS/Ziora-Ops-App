import { createPiece, updatePiece } from "@/actions/content";
import { Badge, Field, inputCls, Select, cn } from "@/components/ui";
import { ActionForm, Modal, Submit } from "@/components/ui/form";
import type { UserOption } from "@/db/queries";
import type { contentPieces } from "@/db/schema";
import { CONTENT_CHANNEL, CONTENT_PILLAR, CONTENT_STATUS, LEGAL_CHECKLIST, RISK } from "@/lib/labels";

type Piece = typeof contentPieces.$inferSelect;

const PILLAR_DOT: Record<string, string> = {
  producto: "#059669", ia_psicoterapia: "#1D5FA8", estudios: "#6B4FA8", roi: "#D99A2B", psicoterapia_moderna: "#3B8EA5", memes: "#E0607E",
};
export const pillarColor = (p: string) => PILLAR_DOT[p] ?? "#9CA3AF";

function PieceFields({ p, users }: { p?: Piece; users: UserOption[] }) {
  return (
    <>
      {p && <input type="hidden" name="id" value={p.id} />}
      <Field label="Título / gancho"><input name="title" required defaultValue={p?.title} className={inputCls} placeholder="SOAP, DAP, BIRP: las letras que nadie pidió en la universidad" /></Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Pilar"><Select name="pillar" defaultValue={p?.pillar ?? "ia_psicoterapia"} options={Object.entries(CONTENT_PILLAR).map(([k, v]) => [k, v.label])} /></Field>
        <Field label="Canal"><Select name="channel" defaultValue={p?.channel ?? "instagram"} options={Object.entries(CONTENT_CHANNEL)} /></Field>
        <Field label="Formato"><Select name="format" defaultValue={p?.format ?? "carrusel"} options={[["carrusel", "Carrusel"], ["reel", "Reel"], ["imagen", "Imagen"], ["video", "Video"], ["historia", "Historia"], ["aporte", "Aporte en grupo"], ["post", "Post"]]} /></Field>
        <Field label="Estado"><Select name="status" defaultValue={p?.status ?? "idea"} options={Object.entries(CONTENT_STATUS).map(([k, v]) => [k, v.label])} /></Field>
        <Field label="Riesgo"><Select name="risk" defaultValue={p?.risk ?? "low"} options={Object.entries(RISK).map(([k, v]) => [k, v.label])} /></Field>
        <Field label="Fecha"><input type="date" name="publishOn" defaultValue={p?.publishOn ?? ""} className={inputCls} /></Field>
      </div>
      <Field label="Responsable"><Select name="ownerId" defaultValue={p?.ownerId} placeholder="Sin asignar" options={users.map((u) => [u.id, u.name])} /></Field>
      <Field label="Copy"><textarea name="copy" rows={4} defaultValue={p?.copy ?? ""} className={inputCls} /></Field>
      <Field label="Fuentes" hint="Una por línea. Obligatorio para cifras: fuente y país."><textarea name="sources" rows={2} defaultValue={p?.sources.join("\n")} className={inputCls} placeholder="APA Practitioner Pulse 2025 (EE. UU.)" /></Field>
      {p && <Field label="URL publicada"><input name="publishedUrl" type="url" defaultValue={p.publishedUrl ?? ""} className={inputCls} /></Field>}
      <fieldset className="rounded-2xl border border-line bg-white p-4">
        <legend className="px-1 text-xs font-bold text-muted">Checklist legal (sección 5 del brief)</legend>
        <p className="mb-2 text-[11px] text-faint">Completa toda la lista para aprobar, programar o publicar.</p>
        <div className="flex flex-col gap-1.5">
          {LEGAL_CHECKLIST.map((item, i) => (
            <label key={i} className="flex items-start gap-2 text-[13px]">
              <input type="checkbox" name="checks[]" value={String(i)} defaultChecked={p?.legalChecklistOk} className="mt-0.5 h-4 w-4 shrink-0 accent-[#059669]" />
              {item}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

export function NewPieceButton({ users, defaultOpen }: { users: UserOption[]; defaultOpen?: boolean }) {
  return (
    <Modal trigger="+ Pieza" title="Nueva pieza de contenido" wide defaultOpen={defaultOpen}>
      <ActionForm action={createPiece}>
        <PieceFields users={users} />
        <Submit>Crear</Submit>
      </ActionForm>
    </Modal>
  );
}

export function PieceChip({ p, users, full }: { p: Piece; users: UserOption[]; full?: boolean }) {
  return (
    <Modal
      title={p.title}
      wide
      triggerClass={cn(
        "w-full rounded-lg border border-line bg-white px-2 py-1 text-left text-[11px] leading-tight hover:border-emerald/40",
        p.status === "published" && "opacity-70",
        full && "rounded-xl px-3 py-2.5 text-[13px]",
      )}
      trigger={
        <span className="flex items-start gap-1.5">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: pillarColor(p.pillar) }} />
          <span className="min-w-0 flex-1">
            <span className={cn("block font-semibold", full ? "" : "line-clamp-2")}>{p.title}</span>
            <span className="block text-faint">{CONTENT_CHANNEL[p.channel]} · {p.format}</span>
            {full && (
              <span className="mt-1.5 flex flex-wrap gap-1">
                <Badge tone={CONTENT_STATUS[p.status].tone}>{CONTENT_STATUS[p.status].label}</Badge>
                {p.risk !== "low" && <Badge tone={RISK[p.risk].tone}>{RISK[p.risk].label}</Badge>}
                {!p.legalChecklistOk && <Badge tone="gray">Checklist pendiente</Badge>}
              </span>
            )}
          </span>
        </span>
      }
    >
      <ActionForm action={updatePiece}>
        <PieceFields p={p} users={users} />
        <Submit>Guardar</Submit>
      </ActionForm>
    </Modal>
  );
}
