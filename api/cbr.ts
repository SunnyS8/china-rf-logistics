import type {IncomingMessage, ServerResponse} from 'http';
import {parse as parseUrl} from 'url';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

function send(res: ServerResponse, code: number, body: unknown): void {
  res.writeHead(code, {...CORS, 'Content-Type': 'application/json'});
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  const q = parseUrl(req.url || '', true);
  const date = typeof q.query.date === 'string' ? q.query.date : '';
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
    send(res, 400, {error: 'date must be DD.MM.YYYY'});
    return;
  }

  const url = `https://www.cbr.ru/scripts/XML_daily.asp?date_req=${date}`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(url, {signal: ctrl.signal});
    clearTimeout(timer);
    if (!r.ok) {
      send(res, 502, {error: `cbr.ru ${r.status}`});
      return;
    }

    const xml = await r.text();

    const extract = (code: string): number | null => {
      const re = new RegExp(
        `<Valute[^>]*>\\s*<NumCode>[^<]*</NumCode>\\s*<CharCode>${code}</CharCode>\\s*<Nominal>(\\d+)</Nominal>\\s*<Name>[^<]*</Name>\\s*<Value>([\\d,]+)</Value>`,
      );
      const m = xml.match(re);
      if (!m) return null;
      const nominal = parseInt(m[1], 10);
      const value = parseFloat(m[2].replace(',', '.'));
      return nominal > 0 && value > 0 ? value / nominal : null;
    };

    const usd = extract('USD');
    const eur = extract('EUR');
    const cny = extract('CNY');
    if (usd == null) {
      send(res, 502, {error: 'USD not found'});
      return;
    }

    const dateMatch = xml.match(/<ValCurs[^>]+date="(\d{2}\.\d{2}\.\d{4})"/);

    // Vercel caches GET responses with s-maxage; CBR data changes at most once a day
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    send(res, 200, {
      date: dateMatch?.[1] || date,
      usdRub: usd,
      eurRub: eur ?? usd * 1.08,
      cnyRub: cny ?? usd / 7.1,
    });
  } catch (e: any) {
    send(res, 502, {error: e?.message || 'fetch failed'});
  }
}