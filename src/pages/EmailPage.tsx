import React from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { getEmailRows } from '../services/emailApi';
import { normalizeEmailRow } from '../utils/normalizers/energyBalance';
import type { EmailRow } from '../types/email';

const SEARCH_DEBOUNCE_MS = 300;

const columns: Array<{ key: keyof EmailRow; label: string; inputType?: string; minWidth?: string }> = [
  { key: 'id', label: 'ID', minWidth: 'min-w-[120px]' },
  { key: 'clientes', label: 'CLIENTES', minWidth: 'min-w-[220px]' },
  { key: 'preco', label: 'PREÇO', minWidth: 'min-w-[150px]' },
  { key: 'dataBase', label: 'DATA BASE', minWidth: 'min-w-[140px]' },
  { key: 'reajustado', label: 'REAJUSTADO', minWidth: 'min-w-[150px]' },
  { key: 'fornecedor', label: 'FORNECEDOR', minWidth: 'min-w-[200px]' },
  { key: 'medidor', label: 'MEDIDOR', minWidth: 'min-w-[150px]' },
  { key: 'consumo', label: 'CONSUMO', minWidth: 'min-w-[140px]' },
  { key: 'perdas3', label: 'PERDAS 3', minWidth: 'min-w-[140px]' },
  { key: 'requisito', label: 'REQUISITO', minWidth: 'min-w-[150px]' },
  { key: 'net', label: 'NET', minWidth: 'min-w-[120px]' },
  { key: 'medicao', label: 'MEDIÇÃO', minWidth: 'min-w-[140px]' },
  { key: 'proinfa', label: 'PROINFA', minWidth: 'min-w-[140px]' },
  { key: 'contrato', label: 'CONTRATO', minWidth: 'min-w-[150px]' },
  { key: 'minimo', label: 'MÍNIMO', minWidth: 'min-w-[140px]' },
  { key: 'maximo', label: 'MÁXIMO', minWidth: 'min-w-[140px]' },
  { key: 'faturar', label: 'FATURAR', minWidth: 'min-w-[140px]' },
  { key: 'cp', label: 'CP', minWidth: 'min-w-[110px]' },
  { key: 'email', label: 'EMAIL', minWidth: 'min-w-[220px]' },
  { key: 'envioOk', label: 'ENVIO OK', minWidth: 'min-w-[150px]' },
  { key: 'disparo', label: 'DISPARO', minWidth: 'min-w-[170px]' },
  { key: 'dataVencimentoBoleto', label: 'DATA VENCIMENTO BOLETO', minWidth: 'min-w-[200px]' },
];

const removeDiacritics = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function EmailPage() {
  const [rows, setRows] = React.useState<EmailRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState('');
  const controllerRef = React.useRef<AbortController | null>(null);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const previousSearchRef = React.useRef('');

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftRows, setDraftRows] = React.useState<Record<string, EmailRow>>({});

  const fetchEmails = React.useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    if (rows.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError('');

    try {
      const payload = await getEmailRows(controller.signal);
      const normalized = (Array.isArray(payload) ? payload : [])
        .map((item, index) => {
          try {
            return normalizeEmailRow(item, index);
          } catch (normalizationError) {
            console.warn('[EmailPage] falha ao normalizar item de email', normalizationError, item);
            return null;
          }
        })
        .filter((row): row is EmailRow => row !== null);

      setRows(normalized);
      setDraftRows({});
    } catch (fetchError) {
      if (controller.signal.aborted) {
        return;
      }
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Não foi possível carregar os dados de email.';
      setError(message);
      console.error('[EmailPage] Erro ao buscar dados de email', fetchError);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [rows.length]);

  React.useEffect(() => {
    void fetchEmails();
    return () => {
      controllerRef.current?.abort();
    };
  }, [fetchEmails]);

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

  const handleDraftChange = React.useCallback(
    (rowId: string, key: keyof EmailRow, value: string) => {
      setDraftRows((prev) => {
        const next = { ...prev };
        const existing = next[rowId] ? { ...next[rowId] } : (() => {
          const original = rows.find((item) => item.id === rowId);
          return original ? { ...original } : undefined;
        })();
        if (!existing) {
          return prev;
        }
        existing[key] = value;
        next[rowId] = existing;
        return next;
      });
    },
    [rows],
  );

  const handleStartEdit = React.useCallback(
    (row: EmailRow) => {
      setEditingId(row.id);
      setDraftRows((prev) => ({ ...prev, [row.id]: { ...row } }));
    },
    [],
  );

  const handleCancelEdit = React.useCallback((rowId: string) => {
    setEditingId((current) => (current === rowId ? null : current));
    setDraftRows((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  }, []);

  const handleConfirmEdit = React.useCallback(
    (rowId: string) => {
      setRows((prev) => {
        const draft = draftRows[rowId];
        if (!draft) {
          return prev;
        }
        return prev.map((item) => (item.id === rowId ? { ...item, ...draft } : item));
      });
      setDraftRows((prev) => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
      setEditingId((current) => (current === rowId ? null : current));
      toast.success('Balanço alterado com sucesso!');
    },
    [draftRows],
  );

  const normalizedQuery = debouncedSearch.trim();
  const normalizedQueryText = normalizedQuery ? removeDiacritics(normalizedQuery) : '';
  const numericQuery = normalizedQuery.replace(/\D/g, '');

  const filteredRows = React.useMemo(() => {
    if (!normalizedQueryText && !numericQuery) {
      return rows;
    }
    return rows.filter((row) => {
      const cliente = removeDiacritics(row.clientes);
      const medidor = removeDiacritics(row.medidor);
      const contrato = removeDiacritics(row.contrato);
      const email = removeDiacritics(row.email);
      const id = removeDiacritics(row.id);
      const dueDigits = row.dataVencimentoBoleto.replace(/\D/g, '');
      return (
        cliente.includes(normalizedQueryText) ||
        medidor.includes(normalizedQueryText) ||
        contrato.includes(normalizedQueryText) ||
        email.includes(normalizedQueryText) ||
        id.includes(normalizedQueryText) ||
        (!!numericQuery && dueDigits.includes(numericQuery))
      );
    });
  }, [rows, normalizedQueryText, numericQuery]);

  const showLoadingState = loading && rows.length === 0;
  const hasRows = filteredRows.length > 0;

  return (
    <div className="space-y-6 p-4">
      <header className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestão de Emails CCEE</h1>
          <p className="mt-2 max-w-3xl text-sm font-bold text-gray-600 dark:text-white">
            Gerencie e envie emails com dados de contratos e medições de energia.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:max-w-lg">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-white">
                  Busca
                </span>
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
                    placeholder="Buscar por cliente, contrato ou email"
                    aria-label="Buscar registros de email"
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
            {isRefreshing && (
              <span className="text-xs font-semibold uppercase tracking-wide text-yn-orange">
                Atualizando...
              </span>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-bold">Não foi possível carregar os dados de email.</p>
          <p className="font-bold text-red-600/80">{error}</p>
        </div>
      )}

      {showLoadingState && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-6 text-sm font-bold text-gray-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-yn-orange" />
          Carregando emails...
        </div>
      )}

      {!showLoadingState && !hasRows && !error && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm font-bold text-gray-600 shadow-sm">
          Nenhum registro encontrado.
        </div>
      )}

      {hasRows && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="min-w-[1200px] w-full table-auto text-left text-xs sm:text-sm">
            <thead className="bg-yn-orange text-white">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-widest sm:text-xs ${column.minWidth ?? ''}`}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest sm:text-xs">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => {
                const isEditing = editingId === row.id;
                const draft = draftRows[row.id];
                return (
                  <tr key={row.id} className="odd:bg-white even:bg-gray-50 hover:bg-yn-orange/10">
                    {columns.map((column) => {
                      const value = isEditing ? draft?.[column.key] ?? row[column.key] : row[column.key];
                      return (
                        <td key={column.key} className={`px-4 py-3 align-top font-semibold text-gray-700 ${column.minWidth ?? ''}`}>
                          {isEditing ? (
                            <input
                              type={column.inputType ?? 'text'}
                              value={value}
                              onChange={(event) => handleDraftChange(row.id, column.key, event.target.value)}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30 sm:text-sm"
                              aria-label={`Editar ${column.label} do registro ${row.id}`}
                            />
                          ) : (
                            <span className="block text-xs font-semibold text-gray-700 sm:text-sm">{row[column.key]}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmEdit(row.id)}
                          disabled={!isEditing}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white transition hover:brightness-110 ${
                            isEditing ? '' : 'cursor-not-allowed opacity-60'
                          }`}
                          aria-label="Confirmar alterações"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => (isEditing ? handleCancelEdit(row.id) : handleStartEdit(row))}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-500 text-white transition hover:brightness-110"
                          aria-label={isEditing ? 'Cancelar edição' : 'Editar registro'}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
