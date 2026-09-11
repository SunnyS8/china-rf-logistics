import * as XLSX from 'xlsx';
import { ForwarderQuote, DestinationWarehouse, RouteType, CostComponent } from '../types/logistics';

interface RawRoute {
  carrier: string;
  sheet: string;
  destination: DestinationWarehouse;
  routeType: RouteType;
  originPort: string;
  transitHub: string;
  routeDescription: string;
  freightUsd: number;
  railRub: number;
  truckRub: number;
  forwardingRub: number;
  terminalRub: number;
  transitDaysMin: number;
  transitDaysMax: number;
}

function parseNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[^\d.,]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function extractNumbersFromText(text: string): { freight: number; rail: number; truck: number; fee: number; terminal: number; days: string } {
  const result = { freight: 0, rail: 0, truck: 0, fee: 0, terminal: 0, days: '' };

  // Extract freight (USD)
  const freightMatch = text.match(/(?:фрахт|FOB|фоб)\s*[:\s]*(\d[\d\s]*\d)\s*(?:\$|USD|долл|юан)/i)
    || text.match(/(\d[\d\s]*\d)\s*(?:\$|USD)/i);
  if (freightMatch) result.freight = parseNumber(freightMatch[1]);

  // Extract rail (RUB)
  const railMatch = text.match(/(?:жд|ж\/д|ж\.д)\s*[:\s]*(\d[\d\s]*\d)\s*(?:руб|₽|р\.)/i)
    || text.match(/(\d[\d\s]*\d)\s*(?:руб|₽)/i);
  if (railMatch) result.rail = parseNumber(railMatch[1]);

  // Extract truck (RUB)
  const truckMatch = text.match(/(?:авто|вывоз|доставк)\s*[:\s]*(\d[\d\s]*\d)\s*(?:руб|₽|р\.)/i);
  if (truckMatch) result.truck = parseNumber(truckMatch[1]);

  // Extract forwarding fee (RUB)
  const feeMatch = text.match(/(?:экспедир|вознагражд)\s*[:\s]*(\d[\d\s]*\d)\s*(?:руб|₽|р\.)/i);
  if (feeMatch) result.fee = parseNumber(feeMatch[1]);

  // Extract terminal (RUB)
  const terminalMatch = text.match(/(?:терминал|таможн|DTHC|СВХ)\s*[:\s]*(\d[\d\s]*\d)\s*(?:руб|₽|р\.)/i);
  if (terminalMatch) result.terminal = parseNumber(terminalMatch[1]);

  // Extract days
  const daysMatch = text.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:дн|дн\.|дня|день|сутк)/i)
    || text.match(/(?:срок|транзит)\s*[:\s]*(\d+)\s*[-–]\s*(\d+)/i);
  if (daysMatch) result.days = `${daysMatch[1]}-${daysMatch[2]}`;

  return result;
}

function detectDestination(text: string): DestinationWarehouse {
  const lower = text.toLowerCase();
  if (lower.includes('ставрополь') || lower.includes('став')) return 'Ставрополь';
  if (lower.includes('серпухов') || lower.includes('мск') || lower.includes('москв')) return 'Серпухов';
  return 'Серпухов'; // default
}

function detectRouteType(text: string): RouteType {
  const lower = text.toLowerCase();
  if (lower.includes('прям') || lower.includes('direct')) return 'direct_rail_truck';
  if (lower.includes('новоросс') || lower.includes('deep sea')) return 'deep_sea_novorossiysk';
  return 'sea_vvo_rail_truck';
}

function parseIglExcel(workbook: XLSX.WorkBook): RawRoute[] {
  const routes: RawRoute[] = [];

  workbook.SheetNames.forEach(sheetName => {
    const ws = workbook.Sheets[sheetName];
    const data: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    let currentRoute: Partial<RawRoute> = {};

    data.forEach((row, idx) => {
      const text = row.filter(Boolean).join(' ').trim();
      if (!text) return;

      // Detect route header
      if (text.includes('Шанхай') || text.includes('Нинбо') || text.includes('Циндао') || text.includes('Нингбо')) {
        if (currentRoute.freightUsd > 0 || currentRoute.railRub > 0) {
          routes.push(currentRoute as RawRoute);
        }
        currentRoute = {
          carrier: 'ИГЛ',
          sheet: sheetName,
          destination: detectDestination(text + ' ' + sheetName),
          routeType: detectRouteType(text),
          originPort: text.includes('Циндао') ? 'Циндао' : 'Шанхай',
          transitHub: '',
          routeDescription: text,
          freightUsd: 0, railRub: 0, truckRub: 0, forwardingRub: 0, terminalRub: 0,
          transitDaysMin: 25, transitDaysMax: 40
        };
      }

      // Extract costs from each row
      const numbers = extractNumbersFromText(text);
      if (numbers.freight > 0) currentRoute.freightUsd = numbers.freight;
      if (numbers.rail > 0) currentRoute.railRub = numbers.rail;
      if (numbers.truck > 0) currentRoute.truckRub = numbers.truck;
      if (numbers.fee > 0) currentRoute.forwardingRub = numbers.fee;
      if (numbers.terminal > 0) currentRoute.terminalRub = numbers.terminal;
      if (numbers.days) {
        const [min, max] = numbers.days.split('-').map(Number);
        currentRoute.transitDaysMin = min;
        currentRoute.transitDaysMax = max;
      }
    });

    if (currentRoute.freightUsd > 0 || currentRoute.railRub > 0) {
      routes.push(currentRoute as RawRoute);
    }
  });

  return routes;
}

function parseGaleosExcel(workbook: XLSX.WorkBook): RawRoute[] {
  const routes: RawRoute[] = [];
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const data: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  let currentRoute: Partial<RawRoute> = {};

  data.forEach(row => {
    const text = row.filter(Boolean).join(' ').trim();
    if (!text) return;

    if (text.includes('МОРЕ') || text.includes('Прямое ЖД') || text.includes('Прямое жд')) {
      if (currentRoute.freightUsd > 0) {
        routes.push(currentRoute as RawRoute);
      }
      currentRoute = {
        carrier: 'Галеос',
        sheet: 'Лист1',
        destination: detectDestination(text),
        routeType: detectRouteType(text),
        originPort: 'Циндао',
        transitHub: '',
        routeDescription: text.substring(0, 200),
        freightUsd: 0, railRub: 0, truckRub: 0, forwardingRub: 0, terminalRub: 0,
        transitDaysMin: 30, transitDaysMax: 45
      };
    }

    // Parse FOB line - freight in USD
    const fobMatch = text.match(/FOB\s*\w+.*?USD\s*([\d\s]+)/i);
    if (fobMatch) currentRoute.freightUsd = parseNumber(fobMatch[1]);

    // Parse DTHC / terminal
    const dthcMatch = text.match(/DTHC\s*[-–]\s*([\d\s]+)\s*руб/i);
    if (dthcMatch) currentRoute.terminalRub = parseNumber(dthcMatch[1]);

    // Parse truck delivery
    const truckMatch = text.match(/(?:Автодоставка|автодоставка|вывоз)\s*.*?([\d\s]+)\s*рублей/i);
    if (truckMatch) currentRoute.truckRub = parseNumber(truckMatch[1]);

    // Parse forwarding
    const feeMatch = text.match(/(?:Экспедирование|экспедирование)\s*[-–]\s*([\d\s]+)\s*руб/i);
    if (feeMatch) currentRoute.forwardingRub = parseNumber(feeMatch[1]);

    // Parse days
    const daysMatch = text.match(/(\d+)\s*дн/i);
    if (daysMatch) {
      const d = parseInt(daysMatch[1]);
      currentRoute.transitDaysMin = d;
      currentRoute.transitDaysMax = d + 5;
    }

    // Parse direct rail
    const directRailMatch = text.match(/USD\s*([\d\s]+).*?(\d+)\s*дн/i);
    if (directRailMatch) {
      currentRoute.freightUsd = parseNumber(directRailMatch[1]);
      currentRoute.transitDaysMin = parseInt(directRailMatch[2]);
      currentRoute.transitDaysMax = parseInt(directRailMatch[2]) + 5;
    }
  });

  if (currentRoute.freightUsd > 0) {
    routes.push(currentRoute as RawRoute);
  }

  return routes;
}

function parseDelporteExcel(workbook: XLSX.WorkBook): RawRoute[] {
  const routes: RawRoute[] = [];
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const data: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  data.forEach(row => {
    const text = row.filter(Boolean).join(' ').trim();
    if (!text || text.length < 10) return;

    // Parse sea route to Stavropol via Vladik
    if (text.includes('Владик') && text.includes('Ставрополь')) {
      const freightMatch = text.match(/(?:фоб|ФОБ)\s*\w+\s*[-–]?\s*Владик?\s*([\d\s]+)/i)
        || text.match(/FOB\s*\w+\s*[-–]?\s*Владик?\s*([\d\s]+)/i)
        || text.match(/([\d\s]+)\s*по курсу/i);
      const railMatch = text.match(/Владик\s*[-–]?\s*Тимашёвск\s*([\d\s]+)/i);
      const truckMatch = text.match(/(?:Ставрополь|вывоз)\s*([\d\s]+)/i);
      const feeMatch = text.match(/(?:экспедир|вознагражд)\s*([\d\s]+)/i);

      if (freightMatch || railMatch) {
        routes.push({
          carrier: 'Дельпорте',
          sheet: 'Лист1',
          destination: 'Ставрополь',
          routeType: 'sea_vvo_rail_truck',
          originPort: 'Шанхай',
          transitHub: 'Владивосток → Тимашевск',
          routeDescription: text.substring(0, 200),
          freightUsd: freightMatch ? parseNumber(freightMatch[1]) : 4700,
          railRub: railMatch ? parseNumber(railMatch[1]) : 388500,
          truckRub: truckMatch ? parseNumber(truckMatch[1]) : 104000,
          forwardingRub: feeMatch ? parseNumber(feeMatch[1]) : 130000,
          terminalRub: 0,
          transitDaysMin: 35,
          transitDaysMax: 45
        });
      }
    }

    // Parse direct rail to Krasnodar/Rostov
    if (text.includes('Прямой поезд') && (text.includes('Краснодар') || text.includes('Ростов'))) {
      const freightMatch = text.match(/ставка\s*([\d\s]+)/i) || text.match(/([\d\s]+)\+50/i);
      const terminalMatch = text.match(/терминалк\w*\s*[\w\s]*?([\d\s]+)/i);
      const truckMatch = text.match(/(?:Ставрополь|вывоз)\s*([\d\s]+)/i);
      const feeMatch = text.match(/(?:экспедир|вознагражд)\s*([\d\s]+)/i);

      routes.push({
        carrier: 'Дельпорте',
        sheet: 'Лист1',
        destination: detectDestination(text),
        routeType: 'direct_rail_truck',
        originPort: text.includes('Циндао') ? 'Циндао' : 'Шанхай',
        transitHub: 'Краснодар/Ростов',
        routeDescription: text.substring(0, 200),
        freightUsd: freightMatch ? parseNumber(freightMatch[1]) : 11400,
        railRub: 0,
        truckRub: truckMatch ? parseNumber(truckMatch[1]) : 100000,
        forwardingRub: feeMatch ? parseNumber(feeMatch[1]) : 13000,
        terminalRub: terminalMatch ? parseNumber(terminalMatch[1]) : 50000,
        transitDaysMin: 22,
        transitDaysMax: 28
      });
    }
  });

  return routes;
}

function parsePortQingdaoExcel(workbook: XLSX.WorkBook): RawRoute[] {
  const routes: RawRoute[] = [];
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // This file has a table structure
  // Row 0: headers, Row 1-6: data
  if (data.length >= 7) {
    const headers = data[1] || []; // carriers
    for (let col = 2; col < headers.length; col++) {
      const carrierName = headers[col] || `Маршрут ${col}`;
      const freight = data[2] ? Number(data[2][col]) || 0 : 0;
      const rail = data[3] ? Number(data[3][col]) || 0 : 0;
      const truck = data[4] ? Number(data[4][col]) || 0 : 0;
      const fee = data[5] ? Number(data[5][col]) || 0 : 0;

      if (freight > 0 || rail > 0) {
        routes.push({
          carrier: carrierName.split('-')[0].trim(),
          sheet: 'Лист1',
          destination: 'Ставрополь',
          routeType: col === 4 ? 'direct_rail_truck' : 'sea_vvo_rail_truck',
          originPort: 'Циндао',
          transitHub: col === 4 ? 'Прямое ЖД' : 'Владивосток → Ростов',
          routeDescription: carrierName,
          freightUsd: freight,
          railRub: rail,
          truckRub: truck,
          forwardingRub: fee,
          terminalRub: 0,
          transitDaysMin: col === 4 ? 30 : 40,
          transitDaysMax: col === 4 ? 35 : 50
        });
      }
    }
  }

  return routes;
}

function rawRouteToQuote(raw: RawRoute, idx: number): ForwarderQuote {
  return {
    id: `parsed-${Date.now()}-${idx}`,
    forwarderName: raw.carrier,
    destination: raw.destination,
    originPort: raw.originPort,
    routeType: raw.routeType,
    routeDescription: raw.routeDescription,
    transitHub: raw.transitHub,
    oceanFreight: { amount: raw.freightUsd, currency: 'USD' },
    railFreight: { amount: raw.railRub, currency: 'RUB' },
    truckDelivery: { amount: raw.truckRub, currency: 'RUB' },
    forwarderFee: { amount: raw.forwardingRub, currency: 'RUB' },
    terminalExpenses: { amount: raw.terminalRub, currency: 'RUB' },
    transitDaysMin: raw.transitDaysMin || 25,
    transitDaysMax: raw.transitDaysMax || 40,
    equipment: "40'HC",
    validUntil: '2026-10-31',
    comments: ''
  };
}

export function parseExcelFile(file: File): Promise<ForwarderQuote[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      let routes: RawRoute[] = [];
      const fileName = file.name.toLowerCase();

      if (fileName.includes('игл')) {
        routes = parseIglExcel(workbook);
      } else if (fileName.includes('галеос')) {
        routes = parseGaleosExcel(workbook);
      } else if (fileName.includes('дельпорте')) {
        routes = parseDelporteExcel(workbook);
      } else if (fileName.includes('циндао') || fileName.includes('порт')) {
        routes = parsePortQingdaoExcel(workbook);
      } else {
        // Generic parser
        workbook.SheetNames.forEach(sheetName => {
          const ws = workbook.Sheets[sheetName];
          const data: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
          data.forEach(row => {
            const text = row.filter(Boolean).join(' ');
            const numbers = extractNumbersFromText(text);
            if (numbers.freight > 0 || numbers.rail > 0) {
              routes.push({
                carrier: file.name.replace('.xlsx', ''),
                sheet: sheetName,
                destination: detectDestination(text),
                routeType: detectRouteType(text),
                originPort: 'Шанхай',
                transitHub: '',
                routeDescription: text.substring(0, 200),
                freightUsd: numbers.freight,
                railRub: numbers.rail,
                truckRub: numbers.truck,
                forwardingRub: numbers.fee,
                terminalRub: numbers.terminal,
                transitDaysMin: 25,
                transitDaysMax: 40
              });
            }
          });
        });
      }

      const quotes = routes.map((r, i) => rawRouteToQuote(r, i));
      resolve(quotes);
    } catch (error) {
      reject(error);
    }
  });
}
