import { CostComponent, ForwarderQuote } from '../types/logistics';

export interface CalculatedCost {
  totalUsd: number;
  totalRub: number;
  oceanFreightUsd: number;
  oceanFreightRub: number;
  railFreightUsd: number;
  railFreightRub: number;
  truckDeliveryUsd: number;
  truckDeliveryRub: number;
  forwarderFeeUsd: number;
  forwarderFeeRub: number;
  terminalExpensesUsd: number;
  terminalExpensesRub: number;
  overweightRub: number;
  overweightUsd: number;
  vatRub: number;
  vatUsd: number;
  totalWithVatUsd: number;
  totalWithVatRub: number;
  totalWithoutVatUsd: number;
  totalWithoutVatRub: number;
}

export function toUsd(comp: CostComponent, rate: number): number {
  if (comp.currency === 'USD') return comp.amount;
  return rate > 0 ? comp.amount / rate : 0;
}

export function toRub(comp: CostComponent, rate: number): number {
  if (comp.currency === 'RUB') return comp.amount;
  return comp.amount * rate;
}

/** Доплата за перевес: (фактический вес - включённый тоннаж) * тариф за тонну */
export function calcOverweightRub(quote: ForwarderQuote): number {
  const overweight = quote.weightTons - quote.maxWeightTons;
  if (overweight <= 0 || quote.overweightRateRub <= 0) return 0;
  return Math.ceil(overweight) * quote.overweightRateRub;
}

export function calculateQuoteCost(quote: ForwarderQuote, rate: number): CalculatedCost {
  const vatRate = quote.vatRate / 100;

  // International ocean freight — always without VAT
  const oceanUsd = toUsd(quote.oceanFreight, rate);
  const oceanRub = oceanUsd * rate;

  // Russian services (rail, truck, forwarding, terminal) — subject to VAT
  const railUsd = toUsd(quote.railFreight, rate);
  const truckUsd = toUsd(quote.truckDelivery, rate);
  const feeUsd = toUsd(quote.forwarderFee, rate);
  const termUsd = toUsd(quote.terminalExpenses, rate);

  // Overweight surcharge (does not include VAT — added on top)
  const overweightRub = calcOverweightRub(quote);
  const overweightUsd = rate > 0 ? overweightRub / rate : 0;

  // Sum without VAT (base services only)
  const domesticServicesRub = (railUsd + truckUsd + feeUsd + termUsd) * rate;
  const baseUsd = oceanUsd + railUsd + truckUsd + feeUsd + termUsd;

  // VAT on Russian services only (rail, truck, forwarding, terminal)
  const vatRub = domesticServicesRub * vatRate;
  const vatUsd = vatRub / rate;

  const totalWithoutVatUsd = baseUsd + overweightUsd;
  const totalWithoutVatRub = totalWithoutVatUsd * rate;
  const totalWithVatUsd = totalWithoutVatUsd + vatUsd;
  const totalWithVatRub = totalWithoutVatRub + vatRub;

  return {
    totalUsd: Math.round(totalWithVatUsd),
    totalRub: Math.round(totalWithVatRub),
    oceanFreightUsd: Math.round(oceanUsd),
    oceanFreightRub: Math.round(oceanRub),
    railFreightUsd: Math.round(railUsd),
    railFreightRub: Math.round(railUsd * rate),
    truckDeliveryUsd: Math.round(truckUsd),
    truckDeliveryRub: Math.round(truckUsd * rate),
    forwarderFeeUsd: Math.round(feeUsd),
    forwarderFeeRub: Math.round(feeUsd * rate),
    terminalExpensesUsd: Math.round(termUsd),
    terminalExpensesRub: Math.round(termUsd * rate),
    overweightRub: Math.round(overweightRub),
    overweightUsd: Math.round(overweightUsd),
    vatRub: Math.round(vatRub),
    vatUsd: Math.round(vatUsd),
    totalWithVatUsd: Math.round(totalWithVatUsd),
    totalWithVatRub: Math.round(totalWithVatRub),
    totalWithoutVatUsd: Math.round(totalWithoutVatUsd),
    totalWithoutVatRub: Math.round(totalWithoutVatRub),
  };
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatRUB(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(amount);
}