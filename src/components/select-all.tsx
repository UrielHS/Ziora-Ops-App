"use client";

/** Casilla que marca o desmarca todas las casillas `name` del mismo formulario que no estén deshabilitadas. */
export function SelectAll({ name, label = "Seleccionar todos" }: { name: string; label?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
      <input
        type="checkbox"
        className="h-4 w-4 accent-emerald"
        onChange={(e) => {
          const form = e.currentTarget.form;
          form?.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:not(:disabled)`).forEach((i) => {
            i.checked = e.currentTarget.checked;
          });
        }}
      />
      {label}
    </label>
  );
}
