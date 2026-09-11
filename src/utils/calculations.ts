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
}

export function toUsd(comp: CostComponent, rate: number): number {
  if (comp.currency === 'USD') return comp.amount;
  return rate > 0 ? comp.amount / rate : 0;
}

export function toRub(comp: CostComponent, rate: number): number {
  if (comp.currency === 'RUB') return comp.amount;
  return comp.amount * rate;
}

export function calculateQuoteCost(quote: ForwarderQuote, rate: number): CalculatedCost {
  const oceanUsd = toUsd(quote.oceanFreight, rate);
  const railUsd = toUsd(quote.railFreight, rate);
  const truckUsd = toUsd(quote.truckDelivery, rate);
  const feeUsd = toUsd(quote.forwarderFee, rate);
  const termUsd = toUsd(quote.terminalExpenses, rate);

  const totalUsd = oceanUsd + railUsd + truckUsd + feeUsd + termUsd;
  const totalRub = totalUsd * rate;

  return {
    totalUsd: Math.round(totalUsd),
    totalRub: Math.round(totalRub),
    oceanFreightUsd: Math.round(oceanUsd),
    oceanFreightRub: Math.round(oceanUsd * rate),
    railFreightUsd: Math.round(railUsd),
    railFreightRub: Math.round(railUsd * rate),
    truckDeliveryUsd: Math.round(truckUsd),
    truckDeliveryRub: Math.round(truckUsd * rate),
    forwarderFeeUsd: Math.round(feeUsd),
    forwarderFeeRub: Math.round(feeUsd * rate),
    terminalExpensesUsd: Math.round(termUsd),
    terminalExpensesRub: Math.round(termUsd * rate)
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
