export function cbrArchiveUrl(date: string): string {
  const [y, m, d] = date.split('-');
  return `https://www.cbr-xml-daily.ru/archive/${y}/${m}/${d}/daily_json.js`;
}

function parseUsd(json: { Valute?: { USD?: { Value?: number } } }): number {
  const val = json?.Valute?.USD?.Value;
  return typeof val === 'number' && val > 0 ? val : 0;
}

async function fetchJson(url: string, timeoutMs: number): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return 0;
    const json = await res.json();
    return parseUsd(json);
  } finally {
    clearTimeout(timer);
  }
}

/** Курс ЦБ РФ на дату (archive) с фолбэком на последний доступный курс */
export async function fetchCbrRate(date: string, timeoutMs = 8000): Promise<number> {
  const archiveVal = await fetchJson(cbrArchiveUrl(date), timeoutMs);
  if (archiveVal > 0) return archiveVal;

  const latestVal = await fetchJson('https://www.cbr-xml-daily.ru/daily_json.js', timeoutMs);
  if (latestVal > 0) return latestVal;

  throw new Error('Не удалось получить курс ЦБ РФ');
}

/** Усреднение за период [from, to]: берём курсы по будним дням */
export async function fetchCbrAverage(from: string, to: string, timeoutMs = 10000): Promise<number> {
  const dates: string[] = [];
  const current = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() + 1);
  }
  if (dates.length === 0) dates.push(from);

  let sum = 0;
  let count = 0;
  for (const d of dates.slice(0, 30)) {
    try {
      const val = await fetchCbrRate(d, 6000);
      if (val > 0) { sum += val; count++; }
    } catch {
      // skip missing date
    }
  }
  if (count === 0) {
    try {
      const latest = await fetchJson('https://www.cbr-xml-daily.ru/daily_json.js', timeoutMs);
      if (latest > 0) return latest;
    } catch {
      // fall through
    }
    throw new Error('Не удалось получить курс ЦБ РФ');
  }
  return Math.round((sum / count) * 100) / 100;
}