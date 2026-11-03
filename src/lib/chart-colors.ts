/**
 * Colores de gráficas. Viven fuera de componentes "use client" para que las páginas de servidor
 * reciban los valores (importar una constante de un módulo cliente entrega una referencia vacía).
 *
 * Un color fijo por red (el color sigue a la red, no a su posición). Paleta de referencia validada
 * (CVD y visión normal en pares adyacentes). Verde y amarillo quedan bajo 3:1 sobre blanco, por eso
 * cada serie lleva etiqueta directa y hay vista de tabla.
 */
export const PLATFORM_COLOR: Record<string, string> = {
  instagram: "#2a78d6", facebook: "#eb6834", tiktok: "#1baf7a", linkedin: "#eda100",
};
export const SINGLE_COLOR = "#059669";
