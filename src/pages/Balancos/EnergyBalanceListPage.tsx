import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Zap, Check, AlertTriangle, Circle } from 'lucide-react';
import UploadCsvModal from '../../components/balancos/UploadCsvModal';
import { getList } from '../../services/energyBalanceApi';
import { normalizeEnergyBalanceListItem } from '../../utils/normalizers/energyBalance';
import type { EnergyBalanceListItem } from '../../types/energyBalance';

const SEARCH_DEBOUNCE_MS = 300;

const removeDiacritics = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

type UploadResult = { balanceId?: string; shouldRefresh?: boolean };

type SentOkBadgeProps = {
  sentOk?: boolean | null;
};

function SentOkBadge({ sentOk }: SentOkBadgeProps) {
  const baseClassName =
    'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold';

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
}

export default function EnergyBalanceListPage() {
  const navigate = useNavigate();
  const [items, setItems] = React.useState<EnergyBalanceListItem[]>([]);
  const itemsRef = React.useRef<EnergyBalanceListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const previousSearchRef = React.useRef('');
  const controllerRef = React.useRef<AbortController | null>(null);
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);

  const fetchBalances = React.useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    if (itemsRef.current.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError('');
    try {
      const payload = await getList(controller.signal);
      const normalized = (Array.isArray(payload) ? payload : [])
        .map((row) => {
          try {
            const normalizedRow = normalizeEnergyBalanceListItem(row);
            return normalizedRow;
          } catch (normalizationError) {
            console.warn('[EnergyBalanceList] falha ao normalizar item', normalizationError, row);
            return null;
          }
        })
        .filter((row): row is EnergyBalanceListItem => row !== null);

      itemsRef.current = normalized;
      setItems(normalized);
    } catch (fetchError) {
      if (controller.signal.aborted) {
        return;
      }
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Não foi possível carregar os balanços energéticos.';
      setError(message);
      console.error('[EnergyBalanceList] Erro ao buscar balanços', fetchError);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setIsRefreshing(false);
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

  React.useEffect(() => {
    if (previousSearchRef.current && searchTerm === '') {
      searchInputRef.current?.focus();
    }
    previousSearchRef.current = searchTerm;
  }, [searchTerm]);

  const handleUploadComplete = React.useCallback(
    (result: UploadResult) => {
      if (result.balanceId) {
        navigate(`/balancos/${result.balanceId}`);
        return;
      }
      void fetchBalances();
    },
    [fetchBalances, navigate],
  );

  const normalizedQuery = debouncedSearch.trim();
  const normalizedQueryText = normalizedQuery ? removeDiacritics(normalizedQuery) : '';
  const numericQuery = normalizedQuery.replace(/\D/g, '');

  const filteredItems = React.useMemo(() => {
    if (!normalizedQueryText && !numericQuery) {
      return items;
    }
    return items.filter((item) => {
      const clientName = removeDiacritics(item.cliente);
      const meterCode = removeDiacritics(item.meterCode);
      const cnpjDigits = item.cnpj.replace(/\D/g, '');
      return (
        clientName.includes(normalizedQueryText) ||
        meterCode.includes(normalizedQueryText) ||
        (!!numericQuery && cnpjDigits.includes(numericQuery))
      );
    });
  }, [items, normalizedQueryText, numericQuery]);

  const hasData = filteredItems.length > 0;
  const totalFiltered = filteredItems.length;

  const groupedItems = React.useMemo(() => {
    if (!hasData) {
      return [];
    }
    const order: string[] = [];
    const map = new Map<string, EnergyBalanceListItem[]>();
    filteredItems.forEach((item) => {
      const label = item.referenceBaseLabel || 'Sem referência';
      if (!map.has(label)) {
        map.set(label, []);
        order.push(label);
      }
      map.get(label)!.push(item);
    });
    return order.map((label, index) => ({
      id: `${label}-${index}`,
      label,
      items: map.get(label) ?? [],
    }));
  }, [filteredItems, hasData]);
  const showLoadingState = loading && itemsRef.current.length === 0;

  return (
    <div className="space-y-6 p-4">
      <header className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Balanço Energético</h1>
          <p className="mt-2 max-w-2xl text-sm font-bold text-gray-600 dark:text-white">
            Encontre e acompanhe o saldo energético dos clientes.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:max-w-md">
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
                    placeholder="Buscar cliente por nome"
                    aria-label="Buscar balanços energéticos"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm font-bold text-gray-900 placeholder-gray-500 shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                      aria-label="Limpar busca"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-yn-orange px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
            >
              Enviar planilha
            </button>
          </div>
        </div>
      </header>

      <section aria-labelledby="lista-balancos" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 id="lista-balancos" className="text-lg font-bold text-gray-900 dark:text-white">
              Lista de balanços
            </h2>
            {hasData && (
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {totalFiltered === 1 ? '1 balanço encontrado' : `${totalFiltered} balanços encontrados`}
              </span>
            )}
          </div>
          {isRefreshing && (
            <span className="text-xs font-semibold uppercase tracking-wide text-yn-orange">Atualizando...</span>
          )}
        </div>

        {error && (
          <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold">Não foi possível carregar os balanços energéticos.</p>
              <p className="font-bold text-red-600/80">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void fetchBalances()}
              className="inline-flex items-center justify-center rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-700 transition hover:border-red-400 hover:bg-red-100"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {showLoadingState ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
            Carregando balanços energéticos...
          </div>
        ) : !hasData ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
            Nenhum balanço encontrado.
          </div>
        ) : (
          <div className="space-y-4">
            {groupedItems.map((group) => (
              <div key={group.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <h3 className="text-sm font-bold text-gray-900">Referencia {group.label}</h3>
                  <span className="text-xs font-semibold text-gray-500">
                    {group.items.length === 1 ? '1 balanço' : `${group.items.length} balanços`}
                  </span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/balancos/${item.id}`)}
                        className="flex w-full flex-col gap-4 p-4 text-left transition hover:bg-yn-orange/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-yn-orange/40 sm:flex-row sm:items-center sm:justify-between"
                        aria-label={`Abrir balanço energético de ${item.cliente}`}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-base font-bold text-gray-900">{item.cliente}</span>
                          <span className="text-xs font-bold text-gray-500">CNPJ {item.cnpj}</span>
                          <span className="text-xs font-bold text-gray-500">Medidor {item.meterCode}</span>
                        </div>
                        <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            <Zap size={14} />
                            {item.consumoKWh}
                          </span>
                          <SentOkBadge sentOk={item.sentOk} />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <UploadCsvModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}
