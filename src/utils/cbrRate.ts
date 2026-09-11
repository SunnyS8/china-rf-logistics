import { ExchangeRates } from '../types/logistics';

export interface CbrRates extends ExchangeRates {
  date: string;
}

export function cbrArchiveUrl(date: string): string {
  const [y, m, d] = date.split('-');
  return `https://www.cbr-xml-daily.ru/archive/${y}/${m}/${d}/daily_json.js`;
}

function parseRates(json: any): ExchangeRates | null {
  const valute = json?.Valute;
  if (!valute) return null;
  const usd = valute.USD?.Value;
  const eur = valute.EUR?.Value;
  const cny = valute.CNY?.Value;
  if (typeof usd !== 'number' || usd <= 0) return null;
  return {
    usdRub: usd,
    eurRub: typeof eur === 'number' && eur > 0 ? eur : usd * 1.08,
    cnyRub: typeof cny === 'number' && cny > 0 ? cny : usd / 7.1,
  };
}

export const DEFAULT_RATES: ExchangeRates = { usdRub: 92.5, eurRub: 108, cnyRub: 13 };

async function fetchJson(url: string, timeoutMs: number): Promise<ExchangeRates | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return parseRates(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Курсы ЦБ РФ (USD/EUR/CNY) на дату; фолбэк на последний опубликованный курс */
export async function fetchCbrRates(date: string, timeoutMs = 8000): Promise<CbrRates> {
  const archived = await fetchJson(cbrArchiveUrl(date), timeoutMs);
  if (archived) return { ...archived, date };

  const latest = await fetchJson('https://www.cbr-xml-daily.ru/daily_json.js', timeoutMs);
  if (latest) return { ...latest, date };

  throw new Error('Не удалось получить курсы ЦБ РФ');
}