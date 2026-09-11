import { CostComponent, ExchangeRates, ForwarderQuote } from '../types/logistics';

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

export function toRub(comp: CostComponent, rates: ExchangeRates): number {
  switch (comp.currency) {
    case 'RUB': return comp.amount;
    case 'EUR': return comp.amount * rates.eurRub;
    case 'CNY': return comp.amount * rates.cnyRub;
    case 'USD':
    default: return comp.amount * rates.usdRub;
  }
}

export function toUsd(comp: CostComponent, rates: ExchangeRates): number {
  return rates.usdRub > 0 ? toRub(comp, rates) / rates.usdRub : 0;
}

/** Доплата за перевес: (фактический вес - включённый тоннаж) * тариф за тонну */
export function calcOverweightRub(quote: ForwarderQuote): number {
  const overweight = quote.weightTons - quote.maxWeightTons;
  if (overweight <= 0 || quote.overweightRateRub <= 0) return 0;
  return Math.ceil(overweight) * quote.overweightRateRub;
}

export function calculateQuoteCost(quote: ForwarderQuote, rates: ExchangeRates): CalculatedCost {
  const vatRate = quote.vatRate / 100;

  // International ocean freight — always without VAT
  const oceanUsd = toUsd(quote.oceanFreight, rates);
  const oceanRub = oceanUsd * rates.usdRub;

  // Russian services (rail, truck, forwarding, terminal) — subject to VAT
  const railUsd = toUsd(quote.railFreight, rates);
  const truckUsd = toUsd(quote.truckDelivery, rates);
  const feeUsd = toUsd(quote.forwarderFee, rates);
  const termUsd = toUsd(quote.terminalExpenses, rates);

  // Overweight surcharge (does not include VAT — added on top)
  const overweightRub = calcOverweightRub(quote);
  const overweightUsd = rates.usdRub > 0 ? overweightRub / rates.usdRub : 0;

  // Sum without VAT (base services only)
  const domesticServicesRub = (railUsd + truckUsd + feeUsd + termUsd) * rates.usdRub;
  const baseUsd = oceanUsd + railUsd + truckUsd + feeUsd + termUsd;

  // VAT on Russian services only (rail, truck, forwarding, terminal)
  const vatRub = domesticServicesRub * vatRate;
  const vatUsd = vatRub / rates.usdRub;

  const totalWithoutVatUsd = baseUsd + overweightUsd;
  const totalWithoutVatRub = totalWithoutVatUsd * rates.usdRub;
  const totalWithVatUsd = totalWithoutVatUsd + vatUsd;
  const totalWithVatRub = totalWithoutVatRub + vatRub;

  return {
    totalUsd: Math.round(totalWithVatUsd),
    totalRub: Math.round(totalWithVatRub),
    oceanFreightUsd: Math.round(oceanUsd),
    oceanFreightRub: Math.round(oceanRub),
    railFreightUsd: Math.round(railUsd),
    railFreightRub: Math.round(railUsd * rates.usdRub),
    truckDeliveryUsd: Math.round(truckUsd),
    truckDeliveryRub: Math.round(truckUsd * rates.usdRub),
    forwarderFeeUsd: Math.round(feeUsd),
    forwarderFeeRub: Math.round(feeUsd * rates.usdRub),
    terminalExpensesUsd: Math.round(termUsd),
    terminalExpensesRub: Math.round(termUsd * rates.usdRub),
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