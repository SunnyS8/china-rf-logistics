import React, { useState } from 'react';
import { X, PlusCircle, Check } from 'lucide-react';
import { DestinationWarehouse, ForwarderQuote, RouteType } from '../types/logistics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (quote: ForwarderQuote) => void;
}

export const AddQuoteModal: React.FC<Props> = ({ isOpen, onClose, onAdd }) => {
  const [forwarderName, setForwarderName] = useState('');
  const [destination, setDestination] = useState<DestinationWarehouse>('Серпухов');
  const [originPort, setOriginPort] = useState('Шанхай');
  const [routeType, setRouteType] = useState<RouteType>('sea_vvo_rail_truck');
  const [transitHub, setTransitHub] = useState('');
  
  const [oceanFreight, setOceanFreight] = useState<number>(2000);
  const [oceanCurrency, setOceanCurrency] = useState<'USD' | 'RUB'>('USD');
  
  const [railFreight, setRailFreight] = useState<number>(210000);
  const [railCurrency, setRailCurrency] = useState<'USD' | 'RUB'>('RUB');
  
  const [truckDelivery, setTruckDelivery] = useState<number>(28000);
  const [truckCurrency, setTruckCurrency] = useState<'USD' | 'RUB'>('RUB');
  
  const [forwarderFee, setForwarderFee] = useState<number>(15000);
  const [feeCurrency, setFeeCurrency] = useState<'USD' | 'RUB'>('RUB');

  const [terminalExpenses, setTerminalExpenses] = useState<number>(250);
  const [terminalCurrency, setTerminalCurrency] = useState<'USD' | 'RUB'>('USD');

  const [transitDaysMin, setTransitDaysMin] = useState<number>(25);
  const [transitDaysMax, setTransitDaysMax] = useState<number>(32);
  const [comments, setComments] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forwarderName.trim()) return;

    const newQuote: ForwarderQuote = {
      id: 'quote-' + Date.now(),
      forwarderName: forwarderName.trim(),
      destination,
      originPort,
      routeType,
      routeDescription: `${originPort} → ${transitHub || 'Транзитный хаб'} → Автовывоз ${destination}`,
      transitHub: transitHub || (routeType === 'direct_rail_truck' ? 'Прямое Ж/Д' : 'Владивосток'),
      oceanFreight: { amount: Number(oceanFreight) || 0, currency: oceanCurrency },
      railFreight: { amount: Number(railFreight) || 0, currency: railCurrency },
      truckDelivery: { amount: Number(truckDelivery) || 0, currency: truckCurrency },
      forwarderFee: { amount: Number(forwarderFee) || 0, currency: feeCurrency },
      terminalExpenses: { amount: Number(terminalExpenses) || 0, currency: terminalCurrency },
      transitDaysMin: Number(transitDaysMin) || 20,
      transitDaysMax: Number(transitDaysMax) || 30,
      equipment: "40'HC",
      validUntil: '2026-10-31',
      comments: comments.trim()
    };

    onAdd(newQuote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Добавить ставку экспедитора</h3>
            <p className="text-xs text-slate-500">Ввод котировки по маршрутам Китай → Серпухов / Ставрополь</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Название экспедитора *
              </label>
              <input
                type="text"
                required
                value={forwarderName}
                onChange={e => setForwarderName(e.target.value)}
                placeholder="Например: Swift Logistics / ТИС"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Склад назначения *
              </label>
              <select
                value={destination}
                onChange={e => setDestination(e.target.value as DestinationWarehouse)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
              >
                <option value="Серпухов">Склад Серпухов (Московская обл.)</option>
                <option value="Ставрополь">Склад Ставрополь (Ставропольский край)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Порт отгрузки (Китай)
              </label>
              <select
                value={originPort}
                onChange={e => setOriginPort(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
              >
                <option value="Шанхай">Шанхай</option>
                <option value="Нинбо">Нинбо</option>
                <option value="Шанхай / Нинбо">Шанхай / Нинбо</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Тип маршрута
              </label>
              <select
                value={routeType}
                onChange={e => {
                  const val = e.target.value as RouteType;
                  setRouteType(val);
                  if (val === 'direct_rail_truck') {
                    setOceanFreight(0);
                    setRailFreight(5200);
                    setRailCurrency('USD');
                  } else {
                    setOceanFreight(2100);
                    setOceanCurrency('USD');
                    setRailFreight(215000);
                    setRailCurrency('RUB');
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
              >
                <option value="sea_vvo_rail_truck">Море (Шанхай/Нинбо → ВВО) + Ж/Д + Автовывоз</option>
                <option value="direct_rail_truck">Прямое Ж/Д (Шанхай → РФ) + Автовывоз</option>
                <option value="deep_sea_novorossiysk">Deep Sea Море (до Новороссийска) + Автовывоз</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Транзитный узел / промежуточная станция
            </label>
            <input
              type="text"
              value={transitHub}
              onChange={e => setTransitHub(e.target.value)}
              placeholder="Владивосток / Ростов-Товарный / Краснодар / Тимашевск"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          {/* Breakdown Cost Inputs */}
          <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Статьи затрат (в валюте счета экспедитора)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Ocean freight */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">Морской фрахт</label>
                <div className="flex">
                  <input
                    type="number"
                    min="0"
                    value={oceanFreight}
                    onChange={e => setOceanFreight(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-l-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                  />
                  <select
                    value={oceanCurrency}
                    onChange={e => setOceanCurrency(e.target.value as 'USD' | 'RUB')}
                    className="px-2 py-1.5 text-xs bg-slate-200 border-y border-r border-slate-300 rounded-r-lg font-bold"
                  >
                    <option value="USD">$</option>
                    <option value="RUB">₽</option>
                  </select>
                </div>
              </div>

              {/* Rail freight */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">Ж/Д тариф</label>
                <div className="flex">
                  <input
                    type="number"
                    min="0"
                    value={railFreight}
                    onChange={e => setRailFreight(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-l-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                  />
                  <select
                    value={railCurrency}
                    onChange={e => setRailCurrency(e.target.value as 'USD' | 'RUB')}
                    className="px-2 py-1.5 text-xs bg-slate-200 border-y border-r border-slate-300 rounded-r-lg font-bold"
                  >
                    <option value="USD">$</option>
                    <option value="RUB">₽</option>
                  </select>
                </div>
              </div>

              {/* Truck delivery */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">Автовывоз (последняя миля)</label>
                <div className="flex">
                  <input
                    type="number"
                    min="0"
                    value={truckDelivery}
                    onChange={e => setTruckDelivery(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-l-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                  />
                  <select
                    value={truckCurrency}
                    onChange={e => setTruckCurrency(e.target.value as 'USD' | 'RUB')}
                    className="px-2 py-1.5 text-xs bg-slate-200 border-y border-r border-slate-300 rounded-r-lg font-bold"
                  >
                    <option value="RUB">₽</option>
                    <option value="USD">$</option>
                  </select>
                </div>
              </div>

              {/* Forwarder fee */}
              <div>
                <label className="block text-xs text-slate-600 mb-1">Вознаграждение экспедитора</label>
                <div className="flex">
                  <input
                    type="number"
                    min="0"
                    value={forwarderFee}
                    onChange={e => setForwarderFee(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-l-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                  />
                  <select
                    value={feeCurrency}
                    onChange={e => setFeeCurrency(e.target.value as 'USD' | 'RUB')}
                    className="px-2 py-1.5 text-xs bg-slate-200 border-y border-r border-slate-300 rounded-r-lg font-bold"
                  >
                    <option value="RUB">₽</option>
                    <option value="USD">$</option>
                  </select>
                </div>
              </div>

              {/* Terminal / Customs */}
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-600 mb-1">Терминальные расходы / растаможка</label>
                <div className="flex">
                  <input
                    type="number"
                    min="0"
                    value={terminalExpenses}
                    onChange={e => setTerminalExpenses(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-l-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                  />
                  <select
                    value={terminalCurrency}
                    onChange={e => setTerminalCurrency(e.target.value as 'USD' | 'RUB')}
                    className="px-2 py-1.5 text-xs bg-slate-200 border-y border-r border-slate-300 rounded-r-lg font-bold"
                  >
                    <option value="USD">$</option>
                    <option value="RUB">₽</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Срок доставки (мин. дней)
              </label>
              <input
                type="number"
                min="5"
                value={transitDaysMin}
                onChange={e => setTransitDaysMin(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Срок доставки (макс. дней)
              </label>
              <input
                type="number"
                min="5"
                value={transitDaysMax}
                onChange={e => setTransitDaysMax(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Примечание
            </label>
            <input
              type="text"
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Условия дропа, демередж, свободные дни..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Добавить в анализ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
