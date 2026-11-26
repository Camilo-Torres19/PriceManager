import { money } from './format';
import { PromoType, Promotion } from './promotions.service';

export type PromoStatus = 'vigente' | 'programada' | 'vencida' | 'inactiva';

export const STATUS_LABEL: Record<PromoStatus, string> = {
  vigente: 'Vigente',
  programada: 'Programada',
  vencida: 'Vencida',
  inactiva: 'Inactiva',
};

export const TYPE_LABEL: Record<PromoType, string> = {
  discount_percent: 'Porcentaje',
  discount_fixed: 'Valor fijo',
  '2x1': '2x1',
  bundle: 'Combo',
};

/** Hoy en el celular, como AAAA-MM-DD (hora local, sin desfases) */
export const todayStr = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

/** Una promoción solo aplica si está activa y hoy está dentro de sus fechas */
export const promoStatus = (
  p: Pick<Promotion, 'is_active' | 'start_date' | 'end_date'>,
  today: string = todayStr()
): PromoStatus => {
  if (!p.is_active) return 'inactiva';
  if (p.start_date && p.start_date > today) return 'programada';
  if (p.end_date && p.end_date < today) return 'vencida';
  return 'vigente';
};

/** "-20%" o "-$ 2.500" para la etiqueta de la tarjeta */
export const badgeLabel = (p: Pick<Promotion, 'type' | 'discount_value'>): string => {
  if (p.type === 'discount_percent') return `-${Number(p.discount_value)}%`;
  if (p.type === 'discount_fixed') return `-${money(p.discount_value)}`;
  return TYPE_LABEL[p.type];
};

/** "20 nov 2026" a partir de "2026-11-20" (sin convertir zonas horarias) */
export const dayLabel = (s: string | null): string => {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const rangeLabel = (p: Pick<Promotion, 'start_date' | 'end_date'>): string => {
  if (p.start_date && p.end_date) return `${dayLabel(p.start_date)} → ${dayLabel(p.end_date)}`;
  if (p.start_date) return `Desde ${dayLabel(p.start_date)}, sin fecha fin`;
  if (p.end_date) return `Hasta ${dayLabel(p.end_date)}`;
  return 'Sin fechas (siempre vigente)';
};

/**
 * Precio de un producto con la promoción aplicada, redondeado al peso.
 * - Porcentaje: precio × (1 − v/100)
 * - Valor fijo: precio − v (se RESTA; no es el precio final). Nunca baja de 0.
 * - 2x1 / combo: no cambian el precio unitario.
 */
export const discountedPrice = (
  price: number,
  p: Pick<Promotion, 'type' | 'discount_value'>
): number => {
  const v = Number(p.discount_value);
  if (!(v > 0)) return price;
  if (p.type === 'discount_percent') return Math.max(0, Math.round(price * (1 - v / 100)));
  if (p.type === 'discount_fixed') return Math.max(0, Math.round(price - v));
  return price;
};
