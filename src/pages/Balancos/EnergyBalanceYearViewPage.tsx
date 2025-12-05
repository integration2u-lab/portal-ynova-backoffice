import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, Loader, Zap, Check, AlertTriangle, Circle, ChevronRight, Search } from 'lucide-react';
import { getList } from '../../services/energyBalanceApi';
import { normalizeEnergyBalanceListItem } from '../../utils/normalizers/energyBalance';
import type { EnergyBalanceListItem } from '../../types/energyBalance';

const SEARCH_DEBOUNCE_MS = 300;

const removeDiacritics = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

type YearData = {
  year: number;
  months: MonthData[];
};

type MonthData = {
  month: string; // YYYY-MM
  monthLabel: string; // "jan de 2024"
  balances: EnergyBalanceListItem[];
};

// Função para extrair mês e ano do referenceBaseLabel e retornar YYYY-MM
function extractMonthYear(item: EnergyBalanceListItem, rawData?: any): { year: number; month: string } | null {
  // Primeiro, tenta usar o valor raw da API se disponível
  if (rawData) {
    const record = rawData && typeof rawData === 'object' ? (rawData as Record<string, unknown>) : {};
    const referenceBaseRaw = record.referenceBase || record.reference_base || record.competencia || record.reference || record.mesReferencia;
    
    if (referenceBaseRaw) {
      const rawStr = String(referenceBaseRaw).trim();
      
      // Tenta formato YYYY-MM diretamente
      const yyyymmMatch = rawStr.match(/^(\d{4})-(\d{2})/);
      if (yyyymmMatch) {
        const year = parseInt(yyyymmMatch[1], 10);
        const month = rawStr.substring(0, 7);
        if (year >= 2000 && year <= 2100) {
          return { year, month };
        }
      }
      
      // Tenta formato YYYY-MM-DD
      const yyyymmddMatch = rawStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (yyyymmddMatch) {
        const year = parseInt(yyyymmddMatch[1], 10);
        const month = `${yyyymmddMatch[1]}-${yyyymmddMatch[2]}`;
        if (year >= 2000 && year <= 2100) {
          return { year, month };
        }
      }
    }
  }
  
  // Fallback: tenta extrair do label formatado "jan de 2024"
  const label = item.referenceBaseLabel || '';
  
  const monthNames: Record<string, number> = {
    'jan': 1, 'jan.': 1, 'janeiro': 1, 'janv': 1,
    'fev': 2, 'fev.': 2, 'fevereiro': 2, 'fév': 2,
    'mar': 3, 'mar.': 3, 'março': 3, 'mars': 3,
    'abr': 4, 'abr.': 4, 'abril': 4,
    'mai': 5, 'mai.': 5, 'maio': 5,
    'jun': 6, 'jun.': 6, 'junho': 6,
    'jul': 7, 'jul.': 7, 'julho': 7,
    'ago': 8, 'ago.': 8, 'agosto': 8,
    'set': 9, 'set.': 9, 'setembro': 9,
    'out': 10, 'out.': 10, 'outubro': 10,
    'nov': 11, 'nov.': 11, 'novembro': 11,
    'dez': 12, 'dez.': 12, 'dezembro': 12,
  };
  
  // Tenta formato brasileiro "jan de 2024" ou "jan 2024"
  const monthYearMatch = label.match(/(\w+)\s+(?:de\s+)?(\d{4})/i);
  if (monthYearMatch) {
    const monthName = monthYearMatch[1].toLowerCase().replace('.', '');
    const year = parseInt(monthYearMatch[2], 10);
    const monthNum = monthNames[monthName];
    
    if (monthNum && year >= 2000 && year <= 2100) {
      return {
        year,
        month: `${year}-${String(monthNum).padStart(2, '0')}`,
      };
    }
  }
  
  // Tenta extrair apenas o ano para agrupar
  const yearMatch = label.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    if (year >= 2000 && year <= 2100) {
      // Se não conseguir extrair o mês, usa o primeiro mês como fallback
      return { year, month: `${year}-01` };
    }
  }
  
  return null;
}

// Formatar label do mês para exibição
function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
}

type BalanceItemWithRaw = {
  normalized: EnergyBalanceListItem;
  raw?: any;
};

export default function EnergyBalanceYearViewPage() {
  const navigate = useNavigate();
  const [items, setItems] = React.useState<BalanceItemWithRaw[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [selectedYear, setSelectedYear] = React.useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const controllerRef = React.useRef<AbortController | null>(null);

  const fetchBalances = React.useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const payload = await getList(controller.signal);
      const itemsWithRaw: BalanceItemWithRaw[] = (Array.isArray(payload) ? payload : [])
        .map((row) => {
          try {
            const normalized = normalizeEnergyBalanceListItem(row);
            return {
              normalized,
              raw: row,
            };
          } catch (normalizationError) {
            console.warn('[EnergyBalanceYearView] falha ao normalizar item', normalizationError, row);
            return null;
          }
        })
        .filter((item): item is BalanceItemWithRaw => item !== null);

      setItems(itemsWithRaw);
    } catch (fetchError) {
      if (controller.signal.aborted) {
        return;
      }
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Não foi possível carregar os balanços energéticos.';
      setError(message);
      console.error('[EnergyBalanceYearView] Erro ao buscar balanços', fetchError);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    void fetchBalances();
    return () => {
      controllerRef.current?.abort();
    };
  }, [fetchBalances]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  // Agrupar balanços por ano e mês
  const yearData = React.useMemo(() => {
    const yearMap = new Map<number, Map<string, BalanceItemWithRaw[]>>();

    items.forEach((item) => {
      const monthYear = extractMonthYear(item.normalized, item.raw);
      if (!monthYear) return;

      const { year, month } = monthYear;

      if (!yearMap.has(year)) {
        yearMap.set(year, new Map());
      }

      const monthMap = yearMap.get(year)!;
      if (!monthMap.has(month)) {
        monthMap.set(month, []);
      }

      monthMap.get(month)!.push(item);
    });

    // Converter para array e ordenar
    const years: YearData[] = Array.from(yearMap.entries())
      .map(([year, monthMap]) => {
        const months: MonthData[] = Array.from(monthMap.entries())
          .map(([month, balanceItems]) => ({
            month,
            monthLabel: formatMonthLabel(month),
            balances: balanceItems.map((item) => item.normalized),
          }))
          .sort((a, b) => a.month.localeCompare(b.month));

        return {
          year,
          months,
        };
      })
      .sort((a, b) => b.year - a.year); // Anos mais recentes primeiro

    return years;
  }, [items]);

  // Calcular dados do mês selecionado e filtro (ANTES dos early returns)
  const selectedMonthData = React.useMemo(() => {
    if (!selectedMonth) return null;
    
    const monthParts = selectedMonth.split('-');
    const year = parseInt(monthParts[0], 10);
    const monthLabel = formatMonthLabel(selectedMonth);

    // Encontrar balanços do mês selecionado
    const selectedYearData = yearData.find((yd) => yd.year === year);
    const monthData = selectedYearData?.months.find((m) => m.month === selectedMonth);
    const allBalances = monthData?.balances || [];

    return {
      year,
      monthLabel,
      allBalances,
    };
  }, [selectedMonth, yearData]);

  // Filtrar balanços baseado na busca (ANTES dos early returns)
  const filteredBalances = React.useMemo(() => {
    const normalizedQuery = debouncedSearch.trim();
    const normalizedQueryText = normalizedQuery ? removeDiacritics(normalizedQuery) : '';
    const numericQuery = normalizedQuery.replace(/\D/g, '');
    
    if (!selectedMonthData) return [];
    
    const { allBalances } = selectedMonthData;
    
    if (!normalizedQueryText && !numericQuery) {
      return allBalances;
    }
    
    return allBalances.filter((item) => {
      const clientName = removeDiacritics(item.cliente);
      const meterCode = removeDiacritics(item.meterCode);
      const cnpjDigits = item.cnpj.replace(/\D/g, '');
      return (
        clientName.includes(normalizedQueryText) ||
        meterCode.includes(normalizedQueryText) ||
        (!!numericQuery && cnpjDigits.includes(numericQuery))
      );
    });
  }, [selectedMonthData, debouncedSearch]);

  const handleYearClick = (year: number) => {
    setSelectedYear(year);
  };

  const handleBackToYears = () => {
    setSelectedYear(null);
    setSelectedMonth(null);
  };

  const handleBackToMonths = () => {
    setSelectedMonth(null);
  };

  const handleMonthClick = (month: string) => {
    setSelectedMonth(month);
  };

  const handleBalanceClick = (balanceId: string) => {
    navigate(`/balancos/${balanceId}`);
  };

  // Função para gerar todos os meses do ano
  const getAllMonthsForYear = (year: number): MonthData[] => {
    const months: MonthData[] = [];
    const monthMap = new Map<string, EnergyBalanceListItem[]>();

    // Preencher map com meses que têm balanços
    const yearDataItem = yearData.find((yd) => yd.year === year);
    if (yearDataItem) {
      yearDataItem.months.forEach((monthData) => {
        monthMap.set(monthData.month, monthData.balances);
      });
    }

    // Gerar todos os 12 meses
    for (let monthNum = 1; monthNum <= 12; monthNum++) {
      const month = `${year}-${String(monthNum).padStart(2, '0')}`;
      const balances = monthMap.get(month) || [];
      
      months.push({
        month,
        monthLabel: formatMonthLabel(month),
        balances,
      });
    }

    return months;
  };

  // Componente para badge de status
  const SentOkBadge = ({ sentOk }: { sentOk?: boolean | null }) => {
    const baseClassName = 'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold';
    
    if (sentOk === true) {
      return (
        <span className={`${baseClassName} border-green-200 bg-green-100 text-green-700`}>
          <Check size={14} />
          Email liberado
        </span>
      );
    }
    
    if (sentOk === false) {
      return (
        <span className={`${baseClassName} border-amber-200 bg-amber-100 text-amber-700`}>
          <AlertTriangle size={14} />
          Open para liberar
        </span>
      );
    }
    
    return (
      <span className={`${baseClassName} border-gray-200 bg-gray-100 text-gray-600`}>
        <Circle size={14} />
        Sem status
      </span>
    );
  };

  // Componente para badge PROINFA
  const ProinfaBadge = ({ proinfa }: { proinfa?: string | number | null }) => {
    const baseClassName = 'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold';
    const isFilled = proinfa !== null && proinfa !== undefined && proinfa !== '' && Number(proinfa) > 0;
    
    if (isFilled) {
      return (
        <span className={`${baseClassName} border-green-200 bg-green-100 text-green-700`}>
          <Check size={14} />
          PROINFA
        </span>
      );
    }
    
    return (
      <span className={`${baseClassName} border-red-200 bg-red-100 text-red-700`}>
        <AlertTriangle size={14} />
        PROINFA
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader size={32} className="animate-spin text-yn-orange" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Carregando balanços...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm font-bold text-red-600">
          {error}
        </div>
      </div>
    );
  }

  // Se um mês estiver selecionado, mostrar a lista de balanços
  if (selectedMonth !== null && selectedMonthData) {
    const { monthLabel, allBalances } = selectedMonthData;
    const balances = filteredBalances;

    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToMonths}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Balanços - {monthLabel}
          </h1>
        </div>

        {/* Campo de busca */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-slate-900">
          <div className="w-full">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white">Busca</span>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por cliente, CNPJ ou medidor"
                  aria-label="Buscar balanços"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm font-bold text-gray-900 placeholder-gray-500 shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30 dark:border-gray-700 dark:bg-slate-950 dark:text-white"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Limpar busca"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {balances.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-slate-900">
            {allBalances.length === 0
              ? `Nenhum balanço encontrado para ${monthLabel}`
              : debouncedSearch
                ? `Nenhum balanço encontrado para "${debouncedSearch}"`
                : `Nenhum balanço encontrado para ${monthLabel}`}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-slate-800">
              <Calendar className="h-5 w-5 text-yn-orange" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{monthLabel}</h3>
              <span className="rounded-full bg-yn-orange px-3 py-1 text-xs font-bold text-white">
                {balances.length} {balances.length === 1 ? 'balanço' : 'balanços'}
                {debouncedSearch && allBalances.length !== balances.length && (
                  <span className="ml-1">de {allBalances.length}</span>
                )}
              </span>
            </div>

            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {balances.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleBalanceClick(item.id)}
                    className="flex w-full flex-col gap-4 p-4 text-left transition hover:bg-yn-orange/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-yn-orange/40 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-yn-orange/10"
                    aria-label={`Abrir balanço energético de ${item.cliente}`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-bold text-gray-900 dark:text-white">{item.cliente}</span>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">CNPJ {item.cnpj}</span>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Medidor {item.meterCode}</span>
                    </div>
                    <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        <Zap size={14} />
                        {item.consumoKWh}
                      </span>
                      <ProinfaBadge proinfa={item.proinfa} />
                      <SentOkBadge sentOk={item.sentOk} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Se um ano estiver selecionado, mostrar os meses
  if (selectedYear !== null) {
    const allMonths = getAllMonthsForYear(selectedYear);

    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToYears}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Balanços {selectedYear}
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {allMonths.map((monthData) => {
            const hasBalances = monthData.balances.length > 0;
            
            return (
              <button
                key={monthData.month}
                onClick={() => handleMonthClick(monthData.month)}
                className={`group relative flex flex-col gap-3 rounded-xl border-2 p-6 text-left transition-all hover:shadow-lg ${
                  hasBalances
                    ? 'border-yn-orange bg-yn-orange/5 dark:border-yn-orange dark:bg-yn-orange/10 hover:border-yn-orange/80'
                    : 'border-gray-200 bg-white/50 dark:border-gray-700 dark:bg-slate-900/50 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Calendar className={`h-8 w-8 ${hasBalances ? 'text-yn-orange' : 'text-gray-400 dark:text-gray-500'}`} />
                  {hasBalances && (
                    <span className="text-xs font-semibold text-yn-orange dark:text-yn-orange/80">
                      {monthData.balances.length} {monthData.balances.length === 1 ? 'balanço' : 'balanços'}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${hasBalances ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                    {monthData.monthLabel}
                  </h3>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Mostrar grid de anos
  return (
    <div className="space-y-6 p-4">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Balanço Energético</h1>
        <p className="mt-2 max-w-2xl text-sm font-bold text-gray-600 dark:text-white">
          Selecione um ano para visualizar os balanços mensais
        </p>
      </header>

      {yearData.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
          Nenhum balanço encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {yearData.map((yearInfo) => {
            const totalBalances = yearInfo.months.reduce((sum, month) => sum + month.balances.length, 0);
            
            return (
              <button
                key={yearInfo.year}
                onClick={() => handleYearClick(yearInfo.year)}
                className="group relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-8 text-center transition-all hover:border-yn-orange hover:shadow-lg dark:border-gray-700 dark:bg-slate-900 dark:hover:border-yn-orange"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yn-orange/10 transition group-hover:bg-yn-orange/20">
                  <Calendar className="h-8 w-8 text-yn-orange" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {yearInfo.year}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {totalBalances} {totalBalances === 1 ? 'balanço' : 'balanços'}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {yearInfo.months.length} {yearInfo.months.length === 1 ? 'mês' : 'meses'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

