import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import UploadCsvModal, { UploadCsvModalResult } from '../../components/balancos/UploadCsvModal';
import { getList, pollJob } from '../../services/energyBalanceApi';
import {
  normalizeListItem,
  type NormalizedEnergyBalanceListItem,
} from '../../utils/normalizers/energyBalance';

const LOADING_TEXT = 'Carregando balanços energéticos...';

export default function EnergyBalanceListPage() {
  const navigate = useNavigate();
  const [items, setItems] = React.useState<NormalizedEnergyBalanceListItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isPolling, setIsPolling] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const refreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = React.useRef(true);

  const fetchBalances = React.useCallback(async (search?: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (isMountedRef.current) {
      setLoading(true);
      setError('');
    }

    try {
      const rows = await getList({ search, signal: controller.signal });
      if (!isMountedRef.current) return;

      const normalized = (rows ?? []).map((row) => normalizeListItem(row));
      setItems(normalized);
    } catch (err) {
      if (
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        return;
      }
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Erro ao carregar balanços energéticos.';
      setError(message);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);

    return () => window.clearTimeout(handler);
  }, [searchTerm]);

  React.useEffect(() => {
    void fetchBalances(debouncedSearch || undefined);
  }, [debouncedSearch, fetchBalances]);

  const filteredItems = React.useMemo(() => {
    if (!debouncedSearch) return items;
    const normalizedSearch = debouncedSearch.toLowerCase();
    const numeric = debouncedSearch.replace(/\D/g, '');

    return items.filter((item) => {
      if (item.searchIndex.includes(normalizedSearch)) return true;
      if (numeric && item.cnpjDigits?.includes(numeric)) return true;
      if (item.meterCode?.toLowerCase().includes(normalizedSearch)) return true;
      return false;
    });
  }, [items, debouncedSearch]);

  const handleClearSearch = () => {
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const handleNavigate = (id: string) => {
    navigate(`/balancos/${id}`);
  };

  const handleUploadComplete = React.useCallback(
    async ({ balanceId, jobId }: UploadCsvModalResult) => {
      setIsModalOpen(false);

      if (balanceId) {
        toast.success('Balanço energético criado com sucesso!');
        if (isMountedRef.current) {
          navigate(`/balancos/${balanceId}`);
        }
        return;
      }

      if (jobId) {
        toast.info('Processando planilha. Isso pode levar alguns instantes.');
        setIsPolling(true);
        try {
          const { balanceId: processedId } = await pollJob(jobId);
          if (isMountedRef.current) {
            toast.success('Balanço energético criado com sucesso!');
            navigate(`/balancos/${processedId}`);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Falha ao processar o balanço energético.';
          toast.error(message);
          if (isMountedRef.current) {
            await fetchBalances(debouncedSearch || undefined);
          }
        } finally {
          if (isMountedRef.current) {
            setIsPolling(false);
          }
        }
        return;
      }

      toast.success('Planilha enviada! Atualizando a listagem em instantes.');
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          void fetchBalances(debouncedSearch || undefined);
        }
      }, 4000);
    },
    [debouncedSearch, fetchBalances, navigate],
  );

  const saldoTagClass = (item: NormalizedEnergyBalanceListItem) => {
    if (item.saldoValue === undefined || Number.isNaN(item.saldoValue)) {
      return 'bg-gray-100 text-gray-600';
    }
    if (item.saldoValue < 0) {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-emerald-100 text-emerald-700';
  };

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
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:max-w-xl">
              <label className="block space-y-1" htmlFor="energy-balance-search">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Busca</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    id="energy-balance-search"
                    ref={inputRef}
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar cliente por nome"
                    aria-label="Buscar balanços energéticos"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-24 text-sm font-bold text-gray-900 placeholder-gray-500 shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-gray-500 transition hover:text-yn-orange"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </label>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-yn-orange px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Enviar planilha CSV para gerar balanço energético"
              disabled={isPolling}
            >
              <UploadCloud size={18} />
              Enviar planilha
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">
          {error}
        </div>
      )}

      <section className="space-y-4">
        {loading ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm font-bold text-gray-500 dark:text-white">
            {LOADING_TEXT}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm font-bold text-gray-500 dark:text-white">
            Nenhum balanço energético encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className="w-full rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-yn-orange hover:shadow"
                aria-label={`Abrir balanço energético de ${item.cliente}`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-3">
                    <div className="text-lg font-bold text-gray-900">{item.cliente}</div>
                    <div className="flex flex-wrap gap-2 text-xs font-bold text-gray-600">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                        Imposto {item.impostoPercent}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                        Consumo {item.consumoKWh}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
                        Geração {item.geracaoKWh}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${saldoTagClass(item)}`}
                    >
                      Saldo {item.saldoKWh}
                    </span>
                    <ChevronRight className="h-5 w-5 text-gray-400" aria-hidden />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <UploadCsvModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={handleUploadComplete}
      />
    </div>
  );
}
