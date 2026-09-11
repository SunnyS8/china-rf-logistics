import { ForwarderQuote } from '../types/logistics';

export interface ParsedSnapshot {
  id: string;
  timestamp: number;
  date: string;
  source: string;
  quotes: ForwarderQuote[];
  fileNames: string[];
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// --- Validation rules ---
const VALID_RANGES = {
  oceanFreightUsd: { min: 500, max: 15000, label: 'Морской фрахт' },
  railFreightRub: { min: 0, max: 600000, label: 'Ж/Д доставка' },
  truckDeliveryRub: { min: 0, max: 300000, label: 'Автовывоз' },
  forwardingFeeRub: { min: 0, max: 200000, label: 'Вознаграждение' },
  terminalExpensesRub: { min: 0, max: 150000, label: 'Терминальные' },
  transitDays: { min: 10, max: 70, label: 'Срок доставки' },
};

export function validateQuote(q: ForwarderQuote): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!q.forwarderName?.trim()) warnings.push({ field: 'forwarderName', message: 'Не указано название перевозчика', severity: 'error' });
  if (!q.destination) warnings.push({ field: 'destination', message: 'Не указан склад назначения', severity: 'error' });
  if (!q.routeDescription?.trim()) warnings.push({ field: 'routeDescription', message: 'Не указано описание маршрута', severity: 'warning' });

  // At least one cost component must be > 0
  const hasCosts = q.oceanFreight.amount > 0 || q.railFreight.amount > 0;
  if (!hasCosts) warnings.push({ field: 'costs', message: 'Нет данных о стоимости (фрахт и ЖД = 0)', severity: 'error' });

  // Range checks
  const checks = [
    { val: q.oceanFreight.amount, range: VALID_RANGES.oceanFreightUsd },
    { val: q.railFreight.amount, range: VALID_RANGES.railFreightRub },
    { val: q.truckDelivery.amount, range: VALID_RANGES.truckDeliveryRub },
    { val: q.forwarderFee.amount, range: VALID_RANGES.forwardingFeeRub },
    { val: q.terminalExpenses.amount, range: VALID_RANGES.terminalExpensesRub },
  ];

  checks.forEach(({ val, range }) => {
    if (val > 0 && val < range.min) {
      warnings.push({ field: range.label, message: `${range.label}: ${val.toLocaleString('ru-RU')} — кажется слишком низким (мин. ~${range.min.toLocaleString('ru-RU')})`, severity: 'warning' });
    }
    if (val > range.max) {
      warnings.push({ field: range.label, message: `${range.label}: ${val.toLocaleString('ru-RU')} — кажется слишком высоким (макс. ~${range.max.toLocaleString('ru-RU')})`, severity: 'warning' });
    }
  });

  // Transit days
  if (q.transitDaysMin > 0 && q.transitDaysMin < VALID_RANGES.transitDays.min) {
    warnings.push({ field: 'transitDays', message: `Срок ${q.transitDaysMin} дн. — подозрительно мало`, severity: 'warning' });
  }
  if (q.transitDaysMax > VALID_RANGES.transitDays.max) {
    warnings.push({ field: 'transitDays', message: `Срок ${q.transitDaysMax} дн. — слишком долго`, severity: 'warning' });
  }

  // Valid until check
  if (q.validUntil) {
    const validDate = new Date(q.validUntil);
    if (validDate < new Date()) {
      warnings.push({ field: 'validUntil', message: `Ставка просрочена (${q.validUntil})`, severity: 'warning' });
    }
  }

  return warnings;
}

export function validateAllQuotes(quotes: ForwarderQuote[]): Map<string, ValidationWarning[]> {
  const result = new Map<string, ValidationWarning[]>();
  quotes.forEach(q => {
    const warnings = validateQuote(q);
    if (warnings.length > 0) result.set(q.id, warnings);
  });
  return result;
}

// --- History / Snapshots ---
const STORAGE_KEY = 'logistics_parse_history';

export function getHistory(): ParsedSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSnapshot(quotes: ForwarderQuote[], fileNames: string[]): ParsedSnapshot {
  const history = getHistory();
  const snapshot: ParsedSnapshot = {
    id: `snap-${Date.now()}`,
    timestamp: Date.now(),
    date: new Date().toLocaleDateString('ru-RU'),
    source: fileNames.join(', '),
    quotes,
    fileNames,
  };
  history.unshift(snapshot);
  // Keep max 20 snapshots
  if (history.length > 20) history.splice(20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return snapshot;
}

export function deleteSnapshot(id: string) {
  const history = getHistory().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function compareSnapshots(oldSnap: ParsedSnapshot, newSnap: ParsedSnapshot) {
  interface PriceChange {
    carrier: string;
    destination: string;
    oldPriceUsd: number;
    newPriceUsd: number;
    changeUsd: number;
    changePercent: number;
  }

  const changes: PriceChange[] = [];

  newSnap.quotes.forEach(nq => {
    const oq = oldSnap.quotes.find(
      o => o.forwarderName === nq.forwarderName && o.destination === nq.destination && o.routeType === nq.routeType
    );
    if (oq) {
      const oldTotal = calcTotal(oq);
      const newTotal = calcTotal(nq);
      const diff = newTotal - oldTotal;
      if (Math.abs(diff) > 1) {
        changes.push({
          carrier: nq.forwarderName,
          destination: nq.destination,
          oldPriceUsd: oldTotal,
          newPriceUsd: newTotal,
          changeUsd: diff,
          changePercent: oldTotal > 0 ? Math.round((diff / oldTotal) * 100) : 0,
        });
      }
    }
  });

  return changes;
}

function calcTotal(q: ForwarderQuote): number {
  const rate = 92.5; // approximation for comparison
  const toUsd = (amt: number, cur: string) => cur === 'USD' ? amt : amt / rate;
  return Math.round(
    toUsd(q.oceanFreight.amount, q.oceanFreight.currency) +
    toUsd(q.railFreight.amount, q.railFreight.currency) +
    toUsd(q.truckDelivery.amount, q.truckDelivery.currency) +
    toUsd(q.forwarderFee.amount, q.forwarderFee.currency) +
    toUsd(q.terminalExpenses.amount, q.terminalExpenses.currency)
  );
}
