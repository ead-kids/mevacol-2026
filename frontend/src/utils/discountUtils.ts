import type { Discount } from '../types';

export interface ItemDiscountCalculation {
  discount: Discount | null;
  discount_cop: number;
  final_price_cop: number;
  badge_text: string | null;
}

export interface CartTotalsCalculation {
  subtotal_cop: number;
  total_discount_cop: number;
  total_cop: number;
  has_discounts: boolean;
}

/**
 * Normaliza y evalúa si un descuento está vigente en este momento.
 */
export const isDiscountCurrentlyActive = (d: Discount): boolean => {
  if (!d.is_active) return false;
  const now = new Date();
  if (d.start_date) {
    const start = new Date(d.start_date);
    if (now < start) return false;
  }
  if (d.end_date) {
    const end = new Date(d.end_date);
    if (now > end) return false;
  }
  return true;
};

/**
 * Calcula el mejor descuento aplicable a un producto respetando la regla de precedencia:
 * 1. Descuento específico del producto antes que descuento global
 * 2. Mayor beneficio para el cliente entre promociones concurrentes
 * 3. Precios y descuentos siempre redondeados a enteros en Pesos Colombianos (COP)
 */
export const calculateItemDiscount = (
  productId: string,
  basePriceCop: number,
  discounts: Discount[] = []
): ItemDiscountCalculation => {
  const activeDiscounts = discounts.filter(isDiscountCurrentlyActive);

  // Filtrar candidatos
  const specificDiscounts = activeDiscounts.filter((d) => d.product_id === productId);
  const globalDiscounts = activeDiscounts.filter((d) => !d.product_id);

  const candidates = specificDiscounts.length > 0 ? specificDiscounts : globalDiscounts;

  if (candidates.length === 0) {
    return {
      discount: null,
      discount_cop: 0,
      final_price_cop: basePriceCop,
      badge_text: null,
    };
  }

  let bestDiscount: Discount | null = null;
  let maxDiscountCop = 0;

  for (const d of candidates) {
    let candidateDiscountCop = 0;
    if (d.discount_type === 'PERCENTAGE') {
      candidateDiscountCop = Math.round((basePriceCop * Number(d.value)) / 100);
    } else {
      // FIXED
      candidateDiscountCop = Math.min(basePriceCop, Math.round(Number(d.value)));
    }

    if (candidateDiscountCop > maxDiscountCop) {
      maxDiscountCop = candidateDiscountCop;
      bestDiscount = d;
    }
  }

  if (!bestDiscount || maxDiscountCop <= 0) {
    return {
      discount: null,
      discount_cop: 0,
      final_price_cop: basePriceCop,
      badge_text: null,
    };
  }

  const badge_text =
    bestDiscount.discount_type === 'PERCENTAGE'
      ? `-${bestDiscount.value}%`
      : `-$${new Intl.NumberFormat('es-CO').format(bestDiscount.value)}`;

  return {
    discount: bestDiscount,
    discount_cop: maxDiscountCop,
    final_price_cop: Math.max(0, basePriceCop - maxDiscountCop),
    badge_text,
  };
};

/**
 * Calcula subtotales, monto total de descuentos y total neto a pagar para un carrito de compras.
 */
export const calculateCartTotals = (
  items: Array<{ product_id: string; price_cop: number; quantity: number }>,
  discounts: Discount[] = []
): CartTotalsCalculation => {
  let subtotal_cop = 0;
  let total_discount_cop = 0;

  for (const item of items) {
    const qty = Math.max(0, item.quantity || 0);
    const itemSubtotal = Math.round(item.price_cop * qty);
    subtotal_cop += itemSubtotal;

    const discountCalc = calculateItemDiscount(item.product_id, item.price_cop, discounts);
    const itemDiscountTotal = Math.round(discountCalc.discount_cop * qty);
    total_discount_cop += itemDiscountTotal;
  }

  const total_cop = Math.max(0, subtotal_cop - total_discount_cop);

  return {
    subtotal_cop,
    total_discount_cop,
    total_cop,
    has_discounts: total_discount_cop > 0,
  };
};
