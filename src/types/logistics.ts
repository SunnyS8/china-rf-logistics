export type DestinationWarehouse = 'Серпухов' | 'Ставрополь';

export type ContainerSize = '20GP' | '40HC';

export type RouteType = 
  | 'sea_vvo_rail_truck' // Шанхай/Нинбо -> Море ВВО -> ЖД Москва/Ростов -> Авто
  | 'direct_rail_truck'  // Шанхай -> Прямое ЖД -> Москва/Краснодар/Тимашевск -> Авто
  | 'deep_sea_novorossiysk'; // Шанхай/Нинбо -> Море Новороссийск -> Авто

export interface CostComponent {
  amount: number;
  currency: 'USD' | 'RUB';
}

export interface ForwarderQuote {
  id: string;
  forwarderName: string;
  destination: DestinationWarehouse;
  originPort: string; // "Шанхай" | "Нинбо" | "Шанхай / Нинбо"
  routeType: RouteType;
  routeDescription: string;
  transitHub: string; // "Владивосток", "Забайкальск", "Ростов", "Краснодар/Тимашевск"
  
  // Container & weight
  containerSize: ContainerSize;      // "20GP" | "40HC"
  weightTons: number;                // фактический вес груза, т
  maxWeightTons: number;             // тоннаж включённый в базовую ставку (перевес сверх этого)
  overweightRateRub: number;         // доплата за каждую лишнюю тонну, ₽

  // Cost breakdown
  oceanFreight: CostComponent;       // Фрахт (USD)
  railFreight: CostComponent;        // Ж/Д тариф (USD or RUB)
  truckDelivery: CostComponent;      // Автовывоз (RUB)
  forwarderFee: CostComponent;       // Вознаграждение экспедитора (RUB or USD)
  terminalExpenses: CostComponent;   // Терминальные / растаможка (RUB or USD)

  // НДС: ставка НДС на российские услуги (ЖД, авто, терминал). Международный фрахт — без НДС
  vatRate: number;                   // 0 | 5 | 20

  transitDaysMin: number;
  transitDaysMax: number;
  equipment: string; // "40'HC"
  validUntil: string;
  comments?: string;
}

export interface ExchangeRateConfig {
  usdRubRate: number;
  date: string;
  source: string;
}
