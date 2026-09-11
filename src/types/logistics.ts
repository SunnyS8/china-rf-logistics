export type DestinationWarehouse = 'Серпухов' | 'Ставрополь';

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
  
  // Cost breakdown
  oceanFreight: CostComponent;       // Фрахт (USD)
  railFreight: CostComponent;        // Ж/Д тариф (USD or RUB)
  truckDelivery: CostComponent;      // Автовывоз (RUB)
  forwarderFee: CostComponent;       // Вознаграждение экспедитора (RUB or USD)
  terminalExpenses: CostComponent;   // Терминальные / растаможка (RUB or USD)

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
