import { Product } from './catalog.service';
import { discountedPrice, promoStatus } from './promo-utils';
import { Promotion } from './promotions.service';

/** Producto con el precio final que debe ver el preventista */
export interface PricedProduct extends Product {
  /** Precio con la mejor promoción vigente aplicada (o el precio normal) */
  finalPrice: number;
  /** Promoción que dio ese precio (null si no tiene promoción) */
  promo: Promotion | null;
}

/** Solo las promociones activas y dentro de sus fechas hoy */
export const vigentes = (promos: Promotion[]): Promotion[] =>
  promos.filter((p) => promoStatus(p) === 'vigente');

/**
 * Aplica a cada producto la promoción vigente que deje el MEJOR precio.
 * Si ninguna promoción lo baja (o es 2x1/combo), queda con su precio normal.
 */
export const applyBestPromo = (products: Product[], promos: Promotion[]): PricedProduct[] => {
  const byProduct = new Map<number, Promotion[]>();
  for (const promo of vigentes(promos)) {
    for (const id of promo.product_ids) {
      const list = byProduct.get(id) ?? [];
      list.push(promo);
      byProduct.set(id, list);
    }
  }

  return products.map((p) => {
    let finalPrice = p.current_price;
    let best: Promotion | null = null;
    for (const promo of byProduct.get(p.id) ?? []) {
      const price = discountedPrice(p.current_price, promo);
      if (price < finalPrice) {
        finalPrice = price;
        best = promo;
      }
    }
    return { ...p, finalPrice, promo: best };
  });
};
