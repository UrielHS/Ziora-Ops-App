"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/components/ui";


export type Series = { key: string; label: string; color: string; values: (number | null)[] };
type Format = "int" | "mxn" | "pct";

const fmt = (v: number | null | undefined, f: Format) => {
  if (v == null) return "—";
  if (f === "mxn") return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: v < 100 ? 2 : 0 }).format(v);
  if (f === "pct") return `${v.toFixed(2)}%`;
  return new Intl.NumberFormat("es-MX", { notation: v >= 100_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(v);
};
const dayLabel = (iso: string) => new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

/** Escala "bonita": 0 a un máximo redondo, con 3 divisiones. */
function niceMax(max: number) {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((s) => (s * pow * 3) >= max)!;
  return step * pow * 3;
}

export function TimeSeriesChart({
  title, days, series, format = "int", kind = "line", height = 200,
}: { title: string; days: string[]; series: Series[]; format?: Format; kind?: "line" | "bar"; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  // El SVG se dibuja al ancho real del contenedor para que los textos midan lo que dicen (no se escalen).
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = width, H = height, L = 52, R = series.length > 1 && kind === "line" ? 92 : 12, T = 10, B = 24;
  const n = days.length;
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values.filter((v): v is number => v != null))));
  const x = (i: number) => (kind === "bar" ? L + ((i + 0.5) * (W - L - R)) / n : L + (n <= 1 ? 0 : (i * (W - L - R)) / (n - 1)));
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, max / 3, (2 * max) / 3, max];
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(3, Math.floor((width - 80) / 70))));
  const empty = series.every((s) => s.values.every((v) => v == null));
  // Etiquetas directas al final de cada línea, separadas al menos 13px para que no se encimen.
  const endLabels = kind === "line" && series.length > 1 && series.length <= 4
    ? series
      .map((s) => ({ s, i: s.values.findLastIndex((v) => v != null) }))
      .filter((e) => e.i >= 0)
      .map((e) => ({ ...e, y: y(e.s.values[e.i]!) }))
      .sort((a, b) => a.y - b.y)
      .reduce<{ key: string; label: string; ly: number; x: number }[]>((acc, e) => {
        const prev = acc.at(-1);
        acc.push({ key: e.s.key, label: `${e.s.label} ${fmt(e.s.values[e.i], format)}`, ly: prev ? Math.max(e.y, prev.ly + 13) : e.y, x: x(e.i) });
        return acc;
      }, [])
    : [];

  const indexFromEvent = (e: React.MouseEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * (W - L - R);
    const i = kind === "bar" ? Math.floor((px / (W - L - R)) * n) : Math.round((px / (W - L - R)) * (n - 1));
    return Math.min(n - 1, Math.max(0, i));
  };

  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="label">{title}</span>
        {series.length > 1 && (
          <span className="flex flex-wrap gap-3 text-[11px] text-muted">
            {series.map((s) => <span key={s.key} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>)}
          </span>
        )}
      </figcaption>
      {empty ? (
        <p className="rounded-xl bg-[#FAF9F5] px-4 py-8 text-center text-sm text-muted">Sin datos en este periodo.</p>
      ) : (
        <div className="relative min-w-0" ref={box}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block h-auto w-full overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-mint"
            role="img"
            aria-label={`${title}. Usa las flechas para recorrer los días.`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
              if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
              if (e.key === "Escape") setHover(null);
            }}
            onBlur={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#EFEDE6" strokeWidth={1} />
                <text x={L - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-[#9CA3AF] text-[11px]">{fmt(t, format)}</text>
              </g>
            ))}
            {days.map((d, i) => ((i % labelEvery === 0 && n - 1 - i >= labelEvery / 2) || i === n - 1) && (
              <text key={d} x={x(i)} y={H - 6} textAnchor="middle" className="fill-[#9CA3AF] text-[11px]">{dayLabel(d)}</text>
            ))}

            {kind === "bar" ? series.slice(0, 1).map((s) => {
              const bw = Math.max(2, (W - L - R) / n - 2); // 2px de separación entre barras
              return s.values.map((v, i) => {
                if (v == null || v <= 0) return null;
                const top = y(v), x0 = x(i) - bw / 2, base = y(0), r = Math.min(4, bw / 2, base - top);
                return (
                  <path key={i} fill={s.color} opacity={hover == null || hover === i ? 1 : 0.55}
                    d={`M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${base} Z`} />
                );
              });
            }) : series.map((s) => {
              // Los huecos (null) cortan la línea en vez de inventar un valor.
              const segs: string[] = [];
              let cur = "";
              s.values.forEach((v, i) => {
                if (v == null) { if (cur) segs.push(cur); cur = ""; return; }
                cur += `${cur ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
              });
              if (cur) segs.push(cur);
              const lastIdx = s.values.findLastIndex((v) => v != null);
              return (
                <g key={s.key}>
                  {segs.map((d, j) => <path key={j} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />)}
                  {lastIdx >= 0 && series.length <= 4 && (
                    <>
                      <circle cx={x(lastIdx)} cy={y(s.values[lastIdx]!)} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />

                    </>
                  )}
                </g>
              );
            })}

            {endLabels.map((l) => (
              <text key={l.key} x={l.x + 8} y={l.ly} dominantBaseline="middle" className="fill-[#4B5563] text-[11px] font-semibold">{l.label}</text>
            ))}
            {hover != null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#9CA3AF" strokeDasharray="3 3" />
                {kind === "line" && series.map((s) => s.values[hover] != null && (
                  <circle key={s.key} cx={x(hover)} cy={y(s.values[hover]!)} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />
                ))}
              </g>
            )}
            <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="transparent"
              onMouseMove={(e) => setHover(indexFromEvent(e))} onMouseLeave={() => setHover(null)} />
          </svg>
          {hover != null && (
            <div
              className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lg"
              style={{ left: `${(x(hover) / W) * 100}%`, transform: x(hover) > W * 0.6 ? "translateX(calc(-100% - 10px))" : "translateX(10px)" }}
              role="status"
            >
              <p className="mb-1 font-bold">{dayLabel(days[hover])}</p>
              {series.map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-3 text-muted">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
                  <span className="font-semibold text-ink">{fmt(s.values[hover], format)}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
      <details className="text-xs text-muted">
        <summary className="cursor-pointer select-none">Ver tabla</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-line">
          <table className="w-full text-left" aria-describedby={id}>
            <thead className="sticky top-0 bg-[#FAF9F5]"><tr><th className="px-3 py-1.5 font-semibold">Día</th>{series.map((s) => <th key={s.key} className="px-3 py-1.5 text-right font-semibold">{s.label}</th>)}</tr></thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={d} className={cn("border-t border-[#EFEDE6]", hover === i && "bg-mint")}>
                  <td className="px-3 py-1">{dayLabel(d)}</td>
                  {series.map((s) => <td key={s.key} className="px-3 py-1 text-right text-ink">{fmt(s.values[i], format)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span id={id} className="sr-only">{title}</span>
      </details>
    </figure>
  );
}
