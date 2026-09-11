import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Map, 
  FileCheck, 
  DollarSign, 
  Calendar, 
  Ship, 
  CheckCircle2,
  Upload,
  Download,
  RefreshCw
} from 'lucide-react';
import { ForwarderQuote } from './types/logistics';
import { INITIAL_QUOTES } from './data/initialQuotes';
import { normalizeQuotes } from './utils/storage';
import { fetchCbrRate } from './utils/cbrRate';
import { LogisticsTable } from './components/LogisticsTable';
import { RouteMap } from './components/RouteMap';
import { SummaryReport } from './components/SummaryReport';
import { AddQuoteModal } from './components/AddQuoteModal';
import { ImportModal } from './components/ImportModal';
import { HistoryPanel } from './components/HistoryPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState<'rates' | 'routes' | 'report'>('rates');
  
  // Rate & Date state
  const [rate, setRate] = useState<number>(() => {
    const saved = localStorage.getItem('logistics_usd_rate');
    return saved ? parseFloat(saved) : 92.5;
  });

  const [reportDate, setReportDate] = useState<string>(() => {
    const saved = localStorage.getItem('logistics_report_date');
    if (saved) return saved;
    const today = new Date().toISOString().split('T')[0];
    return today;
  });

  // Quotes state
  const [quotes, setQuotes] = useState<ForwarderQuote[]>(() => {
    const saved = localStorage.getItem('logistics_quotes_v1');
    if (saved) {
      try {
        return normalizeQuotes(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading quotes', e);
      }
    }
    return normalizeQuotes(INITIAL_QUOTES);
  });

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('logistics_usd_rate', rate.toString());
  }, [rate]);

  useEffect(() => {
    localStorage.setItem('logistics_report_date', reportDate);
  }, [reportDate]);

  useEffect(() => {
    localStorage.setItem('logistics_quotes_v1', JSON.stringify(quotes));
  }, [quotes]);

  // Auto-fetch CBR exchange rate for the selected date
  const [rateSource, setRateSource] = useState<'cbr' | 'manual'>('cbr');
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRateError(null);
    fetchCbrRate(reportDate)
      .then(val => {
        if (cancelled) return;
        setRate(val);
        setRateSource('cbr');
      })
      .catch(() => {
        if (cancelled) return;
        setRateError('Не удалось получить курс ЦБ, введите вручную');
        setRateSource('manual');
      });
    return () => { cancelled = true; };
  }, [reportDate]);

  const handleAddQuote = (newQuote: ForwarderQuote) => {
    setQuotes(prev => [newQuote, ...prev]);
  };

  const handleDeleteQuote = (id: string) => {
    if (window.confirm('Удалить эту котировку из анализа?')) {
      setQuotes(prev => prev.filter(q => q.id !== id));
    }
  };

  const handleResetQuotes = () => {
    if (window.confirm('Сбросить ставки к исходным данным?')) {
      setQuotes(INITIAL_QUOTES);
    }
  };

  const handleImportQuotes = (imported: ForwarderQuote[]) => {
    setQuotes(prev => [...imported, ...prev]);
  };

  const handleUpdateQuote = (updated: ForwarderQuote) => {
    setQuotes(prev => prev.map(q => q.id === updated.id ? updated : q));
  };

  const handleRestoreQuotes = (restored: ForwarderQuote[]) => {
    setQuotes(restored);
  };

  const handleExportJSON = () => {
    const data = JSON.stringify(quotes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ставки_${reportDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 sm:py-0 sm:h-16 gap-3">
            
            {/* Logo & App Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
                <Ship className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                    Калькулятор логистики
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Китай → РФ
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Склады: Серпухов (Моск. обл.) и Ставрополь (СКФО)
                </p>
              </div>
            </div>

            {/* Quick Currency & Date Indicators in Header */}
            <div className="relative flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">Курс:</span>
                <span className="font-mono font-bold text-white">{rate} ₽</span>
                {rateSource === 'cbr' && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-semibold">
                    ЦБ
                  </span>
                )}
                <button
                  onClick={() => {
                    setRateError(null);
                    fetchCbrRate(reportDate)
                      .then(val => { setRate(val); setRateSource('cbr'); })
                      .catch(() => setRateError('Не удалось получить курс ЦБ'));
                  }}
                  title="Обновить курс ЦБ"
                  className="p-1 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300">{reportDate}</span>
              </div>
              {rateError && (
                <div className="absolute top-full right-4 mt-2 text-[11px] text-red-300 bg-red-950/80 border border-red-800 rounded-lg px-3 py-2 shadow-lg">
                  {rateError}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-950 border-t border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto py-2 no-scrollbar" aria-label="Вкладки">
              <button
                onClick={() => setActiveTab('rates')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'rates'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Table className="w-4 h-4" />
                <span>1. Сравнение ставок</span>
                <span className="ml-1 text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full text-slate-300">
                  {quotes.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('routes')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'routes'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Map className="w-4 h-4" />
                <span>2. Схемы маршрутов</span>
              </button>

              <button
                onClick={() => setActiveTab('report')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === 'report'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>3. Итоговый отчет</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'rates' && (
          <LogisticsTable
            quotes={quotes}
            rate={rate}
            reportDate={reportDate}
            onRateChange={setRate}
            onDateChange={setReportDate}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onDeleteQuote={handleDeleteQuote}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onExportJSON={handleExportJSON}
            onUpdateQuote={handleUpdateQuote}
          />
        )}

        {activeTab === 'routes' && <RouteMap />}

        {activeTab === 'report' && (
          <SummaryReport quotes={quotes} rate={rate} reportDate={reportDate} />
        )}
      </main>

      {/* Add Quote Modal Dialog */}
      <AddQuoteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddQuote}
      />

      {/* Import Modal Dialog */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportQuotes}
        onOpenHistory={() => { setIsImportModalOpen(false); setIsHistoryOpen(true); }}
      />

      {/* History Panel */}
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onRestore={handleRestoreQuotes}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-slate-500 text-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Расчет ставок для складов: Серпухов & Ставрополь.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleResetQuotes}
              className="text-slate-400 hover:text-slate-700 underline"
            >
              Сбросить к исходным ставкам
            </button>
            <span>•</span>
            <span>Конвертация в USD на дату согласования</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
