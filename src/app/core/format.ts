const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** 4800 -> "$ 4.800" */
export const money = (n: number): string => cop.format(n);

/** Fecha corta legible: "19 nov 2026, 3:45 p. m." */
export const shortDate = (iso: string): string =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Saca un mensaje legible de un error HTTP */
export const errorMessage = (err: unknown, fallback = 'Ocurrió un error. Intenta de nuevo.'): string => {
  const e = err as { status?: number; error?: { error?: string } };
  if (e?.status === 0) return 'No se pudo conectar con el servidor.';
  return e?.error?.error ?? fallback;
};
