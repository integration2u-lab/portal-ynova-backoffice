import React from 'react';
import { Check, Loader2, RefreshCw, Search, X, Calendar, ChevronRight, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { getEmailRows, updateEmailRow } from '../services/emailApi';
import { normalizeEmailRow } from '../utils/normalizers/energyBalance';
import type { EmailRow } from '../types/email';

// Helper function to convert EmailRow to API payload format
const convertEmailRowToApiFormat = (row: EmailRow, originalRawData?: Record<string, unknown>): Record<string, unknown> => {
  // Helper to parse number strings
  const parseNumber = (value: string): number | null => {
    if (!value || value === 'Não informado' || value === '-') return null;
    // Remove currency symbols, spaces, and convert BR format (1.234,56) to number
    const cleaned = value.replace(/[R$\s\.]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  // Helper to parse MWh values (remove "MWh" and parse)
  const parseMwh = (value: string): number | null => {
    if (!value || value === 'Não informado' || value === '-') return null;
    const cleaned = value.replace(/MWh\s*/g, '').trim();
    const num = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    return isNaN(num) ? null : num;
  };

  // Helper to parse percentage values
  const parsePercent = (value: string): number | null => {
    if (!value || value === 'Não informado' || value === '-') return null;
    const cleaned = value.replace(/%\s*/g, '').trim();
    const num = parseFloat(cleaned.replace(',', '.'));
    return isNaN(num) ? null : num / 100;
  };

  // Helper to convert date from BR format to ISO
  const parseDate = (value: string, isDateTime = false): string | null => {
    if (!value || value === 'Não informado' || value === '') return null;
    
    // Try to parse BR format (dd/mm/yyyy HH:mm or dd/mm/yyyy)
    if (value.includes('/')) {
      const parts = value.split(' ');
      const datePart = parts[0];
      let timePart = '00:00:00';
      
      if (parts.length > 1) {
        timePart = parts[1].length === 5 ? `${parts[1]}:00` : parts[1];
      }
      
      if (datePart.includes('/')) {
        const [day, month, year] = datePart.split('/');
        // Format as ISO 8601 with timezone (e.g., "2025-10-03T00:00:00.000Z")
        if (isDateTime) {
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}.000Z`;
        } else {
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`;
        }
      }
    }
    
    // If already in datetime-like format, ensure proper ISO format
    if (value.includes('T')) {
      // If missing Z suffix and timezone
      if (!value.includes('Z') && !value.includes('+') && !value.includes('--')) {
        // Remove any milliseconds if present
        const cleaned = value.replace(/\.\d{3}Z?$/, '');
        return `${cleaned}.000Z`;
      }
      return value;
    }
    
    // If already ISO format or other format, return as is
    return value;
  };

  // Helper to parse boolean from "Sim"/"Não" to true/false
  const parseBoolean = (value: string): boolean | null => {
    if (!value || value === 'Não informado' || value === '') return null;
    const normalized = value.toLowerCase().trim();
    
    // Handle positive values
    if (normalized === 'sim' || normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }
    
    // Handle negative values
    if (normalized === 'não' || normalized === 'nao' || normalized === 'n' || normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false;
    }
    
    // Default to false for unknown values
    console.warn('[EmailPage] Unknown boolean value:', value, 'defaulting to false');
    return false;
  };

  // Build API payload
  const payload: Record<string, unknown> = {};

  // Map fields according to API specification
  payload.meter = row.medidor !== 'Não informado' ? row.medidor : null;
  payload.clientName = row.clientes !== 'Não informado' ? row.clientes : null;
  
  // Preserve referenceBase from original data since dataBase is a formatted display value
  if (originalRawData?.referenceBase !== undefined) {
    payload.referenceBase = originalRawData.referenceBase;
  }
  
  payload.price = parseNumber(row.preco);
  payload.supplier = row.fornecedor !== 'Não informado' ? row.fornecedor : null;
  payload.email = row.email !== 'Não informado' ? row.email : null;
  
  // consumptionKwh - need to convert from MWh displayed value
  const consumoMwh = parseMwh(row.consumo);
  payload.consumptionKwh = consumoMwh ? (consumoMwh * 1000).toFixed(8) : null;
  
  payload.loss = parsePercent(row.perdas3);
  // requirement is a number field, parse it
  const requirementNum = parseNumber(row.requisito);
  payload.requirement = requirementNum !== null ? String(requirementNum) : null;
  payload.net = parseNumber(row.net);
  payload.proinfaContribution = parseNumber(row.proinfa);
  payload.contract = row.contrato !== 'Não informado' ? row.contrato : null;
  payload.minDemand = parseMwh(row.minimo);
  payload.maxDemand = parseMwh(row.maximo);
  payload.billable = parseNumber(row.faturar);
  payload.cpCode = row.cp !== 'Não informado' ? row.cp : null;
  
  // Convert boolean fields
  let adjustedValue = parseBoolean(row.reajustado);
  let sentOkValue = parseBoolean(row.envioOk);
  
  // If the value is "Não informado", try to get from original raw data
  if (adjustedValue === null && originalRawData?.adjusted !== undefined) {
    adjustedValue = Boolean(originalRawData.adjusted);
  }
  if (sentOkValue === null && originalRawData?.sentOk !== undefined) {
    sentOkValue = Boolean(originalRawData.sentOk);
  }
  
  console.log('[EmailPage] Converting booleans - reajustado:', row.reajustado, '->', adjustedValue);
  console.log('[EmailPage] Converting booleans - envioOk:', row.envioOk, '->', sentOkValue);
  
  payload.adjusted = adjustedValue;
  payload.sentOk = sentOkValue;
  
  // Don't send sendDate - it's readonly and shouldn't be updated
  // payload.sendDate = parseDate(row.disparo);
  
  payload.billsDate = parseDate(row.dataVencimentoBoleto, true); // isDateTime = true

  // Include original fields that might be needed by the API
  if (originalRawData) {
    ['clientId', 'contractId', 'contactActive', 'createdAt', 'updatedAt'].forEach(key => {
      if (originalRawData[key] !== undefined) {
        payload[key] = originalRawData[key];
      }
    });
  }

  return payload;
};

const SEARCH_DEBOUNCE_MS = 300;

const columns: Array<{ 
  key: keyof EmailRow; 
  label: string; 
  inputType?: string; 
  minWidth?: string; 
  fieldType?: 'text' | 'boolean' | 'number' | 'date' | 'datetime';
  readOnly?: boolean;
  step?: string;
}> = [
  { key: 'id', label: 'ID', minWidth: 'min-w-[120px]', fieldType: 'text', readOnly: true },
  { key: 'clientes', label: 'CLIENTES', minWidth: 'min-w-[220px]', fieldType: 'text' },
  { key: 'preco', label: 'PREÇO', minWidth: 'min-w-[150px]', fieldType: 'number', inputType: 'number', step: '0.01' },
  { key: 'dataBase', label: 'DATA BASE', minWidth: 'min-w-[140px]', fieldType: 'date', inputType: 'date', readOnly: true },
  { key: 'reajustado', label: 'REAJUSTADO', minWidth: 'min-w-[150px]', fieldType: 'boolean' },
  { key: 'fornecedor', label: 'FORNECEDOR', minWidth: 'min-w-[200px]', fieldType: 'text' },
  { key: 'medidor', label: 'MEDIDOR', minWidth: 'min-w-[150px]', fieldType: 'text' },
  { key: 'consumo', label: 'CONSUMO', minWidth: 'min-w-[140px]', fieldType: 'number', inputType: 'number', step: '0.01' },
  { key: 'perdas3', label: 'PERDAS 3', minWidth: 'min-w-[140px]', fieldType: 'number', inputType: 'number', step: '0.01' },
  { key: 'requisito', label: 'REQUISITO', minWidth: 'min-w-[150px]', fieldType: 'number', inputType: 'number', step: '0.01' },
  { key: 'net', label: 'NET', minWidth: 'min-w-[120px]', fieldType: 'number', inputType: 'number', step: '0.01' },
  { key: 'medicao', label: 'MEDIÇÃO', minWidth: 'min-w-[140px]', fieldType: 'text' },
  { key: 'proinfa', label: 'PROINFA', minWidth: 'min-w-[140px]', fieldType: 'number', inputType: 'number', step: '0.01' },
  { key: 'contrato', label: 'CONTRATO', minWidth: 'min-w-[150px]', fieldType: 'text' },
  { key: 'minimo', label: 'MÍNIMO', minWidth: 'min-w-[140px]', fieldType: 'number', inputType: 'number', step: '0.01' },
  { key: 'maximo', label: 'MÁXIMO', minWidth: 'min-w-[140px]', fieldType: 'number', inputType: 'number', step: '0.01' },
  { key: 'faturar', label: 'FATURAR', minWidth: 'min-w-[140px]', fieldType: 'number', inputType: 'number', step: '0.01' },
  { key: 'cp', label: 'CP', minWidth: 'min-w-[110px]', fieldType: 'text' },
  { key: 'email', label: 'EMAIL', minWidth: 'min-w-[220px]', fieldType: 'text', inputType: 'email' },
  { key: 'envioOk', label: 'ENVIO OK', minWidth: 'min-w-[150px]', fieldType: 'boolean' },
  { key: 'disparo', label: 'DISPARO', minWidth: 'min-w-[170px]', fieldType: 'text', readOnly: true },
  { key: 'dataVencimentoBoleto', label: 'DATA VENCIMENTO BOLETO', minWidth: 'min-w-[200px]', fieldType: 'datetime', inputType: 'datetime-local' },
];

const removeDiacritics = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Helper to convert display value to input value for date/datetime fields
const toInputValue = (value: string, fieldType?: string, inputType?: string): string => {
  if (!value || value === 'Não informado' || value === '-') return '';
  
  if (inputType === 'datetime-local' || inputType === 'date') {
    // Try to parse Brazilian date format (dd/mm/yyyy) or ISO format
    if (value.includes('/')) {
      const parts = value.split(' ');
      const datePart = parts[0];
      if (datePart.includes('/')) {
        const [day, month, year] = datePart.split('/');
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        // For datetime-local, add time component
        if (inputType === 'datetime-local') {
          const timePart = parts.length > 1 ? parts[1].slice(0, 5) : '00:00';
          return `${isoDate}T${timePart}`;
        }
        return isoDate;
      }
    }
    // If already in ISO format, convert to datetime-local
    if (value.includes('T')) {
      const dateTime = new Date(value);
      if (!isNaN(dateTime.getTime())) {
        const localDate = new Date(dateTime.getTime() - dateTime.getTimezoneOffset() * 60000);
        const isoString = localDate.toISOString();
        return inputType === 'datetime-local' ? isoString.slice(0, 16) : isoString.slice(0, 10);
      }
    }
  }
  
  return value;
};

// Helper to convert input value back to display format
const fromInputValue = (value: string, fieldType?: string): string => {
  if (!value) return '';
  
  try {
    if (fieldType === 'date' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    }
    
    if (fieldType === 'datetime') {
      // Handle both YYYY-MM-DD and YYYY-MM-DDTHH:mm formats
      let datePart = value;
      let timePart = '00:00';
      
      if (value.includes('T')) {
        [datePart, timePart] = value.split('T');
        // Keep only HH:mm, discard seconds
        timePart = timePart.slice(0, 5);
      }
      
      const [year, month, day] = datePart.split('-');
      return `${day}/${month}/${year} ${timePart}`;
    }
  } catch (error) {
    console.warn('[EmailPage] Error converting input value:', error);
  }
  
  return value;
};

const formatDate = (dateStr: string): string => {
  if (!dateStr || dateStr === 'Não informado') return 'Não informado';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return dateStr;
  }
};

const groupEmailsByMonth = (emails: EmailRow[]) => {
  const groups: Record<string, EmailRow[]> = {};
  
  emails.forEach((email) => {
    // Extrair mês e ano da data base (referenceBase)
    const dateStr = email.dataBase;
    let monthKey = 'Sem data';
    
    if (dateStr && dateStr !== 'Não informado') {
      try {
        let date: Date;
        
        // Try to parse as ISO format first (e.g., "2025-10-02T00:00:00.000Z")
        if (dateStr.includes('T') || dateStr.includes('-')) {
          date = new Date(dateStr);
        } 
        // Try to parse as Brazilian format (dd/mm/yyyy or dd/mm/yyyy HH:mm)
        else if (dateStr.includes('/')) {
          const parts = dateStr.split(/[\/\s]+/);
          if (parts.length >= 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
              date = new Date(year, month, day);
            } else {
              date = new Date(dateStr);
            }
          } else {
            date = new Date(dateStr);
          }
        } else {
          date = new Date(dateStr);
        }
        
        if (!isNaN(date.getTime())) {
          const monthYear = date.toLocaleDateString('pt-BR', { 
            month: 'long', 
            year: 'numeric' 
          });
          monthKey = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
        }
      } catch (error) {
        console.warn('[EmailPage] Erro ao processar data:', dateStr, error);
      }
    }
    
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(email);
  });
  
  // Ordenar os grupos por data (mais recente primeiro)
  const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
    if (a === 'Sem data') return 1;
    if (b === 'Sem data') return -1;
    return b.localeCompare(a, 'pt-BR');
  });
  
  return sortedGroups;
};

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
  const [updatingIds, setUpdatingIds] = React.useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = React.useState<string>('');
  
  // Store original raw data for each row to preserve API fields
  const [originalRawData, setOriginalRawData] = React.useState<Record<string, Record<string, unknown>>>({});

  const fetchEmails = React.useCallback(async (showToast = false) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const isFirstLoad = rows.length === 0;
    if (isFirstLoad) {
      setLoading(true);
    } else if (!showToast) {
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
      
      // Store original raw data for API updates
      const rawDataMap: Record<string, Record<string, unknown>> = {};
      if (Array.isArray(payload)) {
        payload.forEach((item) => {
          if (item && typeof item === 'object') {
            const record = item as Record<string, unknown>;
            const id = (record.id || record.energy_balance_id || String(record.id || '')).toString();
            if (id) {
              rawDataMap[id] = record;
            }
          }
        });
      }
      setOriginalRawData(rawDataMap);
      
      if (!isFirstLoad && showToast) {
        toast.success('Dados atualizados com sucesso!');
      }
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
    void fetchEmails(false);
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
    async (rowId: string) => {
      const draft = draftRows[rowId];
      if (!draft) {
        return;
      }

      setUpdatingIds((prev) => new Set(prev).add(rowId));

      try {
        // Convert EmailRow to API format
        const originalData = originalRawData[rowId];
        console.log('[EmailPage] Draft data before conversion:', draft);
        console.log('[EmailPage] Original raw data:', originalData);
        
        const updateData = convertEmailRowToApiFormat(draft, originalData);
        
        console.log('[EmailPage] Updating row with API data:', updateData);
        
        await updateEmailRow(rowId, updateData);

        // Clear editing state immediately after successful API call
        setEditingId((current) => (current === rowId ? null : current));
        setDraftRows((prev) => {
          const next = { ...prev };
          delete next[rowId];
          return next;
        });

        // Refresh data after successful update
        await fetchEmails(true);
        
        toast.success('Email atualizado com sucesso!');
      } catch (error) {
        console.error('[EmailPage] Erro ao atualizar email:', error);
        let message = 'Erro ao atualizar email';
        
        if (error instanceof Error) {
          if (error.message.includes('fetch')) {
            message = 'Erro de conexão. Verifique sua internet e tente novamente.';
          } else if (error.message.includes('404')) {
            message = 'Registro não encontrado no servidor.';
          } else if (error.message.includes('500')) {
            message = 'Erro interno do servidor. Tente novamente mais tarde.';
          } else {
            message = error.message;
          }
        }
        
        toast.error(`Falha ao atualizar: ${message}`);
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(rowId);
          return next;
        });
      }
    },
    [draftRows, originalRawData, fetchEmails],
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

  const groupedEmails = React.useMemo(() => {
    return groupEmailsByMonth(filteredRows);
  }, [filteredRows]);

  // Definir a primeira aba como ativa quando os dados carregarem
  React.useEffect(() => {
    if (groupedEmails.length > 0 && !activeTab) {
      setActiveTab(groupedEmails[0][0]);
    }
  }, [groupedEmails, activeTab]);

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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fetchEmails(false)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-lg bg-yn-orange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                aria-label="Atualizar dados"
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? 'Atualizando...' : 'Atualizar'}
              </button>
              {isRefreshing && (
                <span className="text-xs font-semibold uppercase tracking-wide text-yn-orange">
                  Atualizando...
                </span>
              )}
            </div>
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
        <div className="space-y-6">
          {/* Abas dos meses */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200">
            {groupedEmails.map(([monthName, monthEmails]) => (
              <button
                key={monthName}
                onClick={() => setActiveTab(monthName)}
                className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition ${
                  activeTab === monthName
                    ? 'bg-yn-orange text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>{monthName}</span>
                <span className={`rounded-full px-2 py-1 text-xs ${
                  activeTab === monthName
                    ? 'bg-white/20 text-white'
                    : 'bg-yn-orange text-white'
                }`}>
                  {monthEmails.length}
                </span>
                {activeTab === monthName && <ChevronRight className="h-4 w-4" />}
              </button>
            ))}
          </div>

          {/* Conteúdo da aba ativa */}
          {groupedEmails.map(([monthName, monthEmails]) => {
            if (activeTab !== monthName) return null;
            
            return (
              <div key={monthName} className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                {/* Cabeçalho do mês ativo */}
                <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <Calendar className="h-5 w-5 text-yn-orange" />
                  <h3 className="text-lg font-bold text-gray-900">{monthName}</h3>
                  <span className="rounded-full bg-yn-orange px-3 py-1 text-xs font-bold text-white">
                    {monthEmails.length} {monthEmails.length === 1 ? 'email' : 'emails'}
                  </span>
                </div>
                
                {/* Tabela de emails do mês */}
                <div className="overflow-x-auto">
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
                      {monthEmails.map((row) => {
                        const isEditing = editingId === row.id;
                        const draft = draftRows[row.id];
                        const isUpdating = updatingIds.has(row.id);
                        return (
                          <tr key={row.id} className="odd:bg-white even:bg-gray-50 hover:bg-yn-orange/10">
                            {columns.map((column) => {
                              const value = isEditing ? draft?.[column.key] ?? row[column.key] : row[column.key];
                              const isReadOnly = column.readOnly;
                              
                              return (
                                <td key={column.key} className={`px-4 py-3 align-top font-semibold text-gray-700 ${column.minWidth ?? ''}`}>
                                  {isEditing && !isReadOnly ? (
                                    column.fieldType === 'boolean' ? (
                                      <select
                                        value={value}
                                        onChange={(event) => handleDraftChange(row.id, column.key, event.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30 sm:text-sm"
                                        aria-label={`Editar ${column.label} do registro ${row.id}`}
                                      >
                                        <option value="Sim">Sim</option>
                                        <option value="Não">Não</option>
                                      </select>
                                    ) : (
                                      <input
                                        type={column.inputType ?? 'text'}
                                        value={(() => {
                                          if (column.fieldType === 'date' || column.fieldType === 'datetime') {
                                            return toInputValue(value as string, column.fieldType, column.inputType);
                                          }
                                          // For number fields, extract the numeric value
                                          if (column.fieldType === 'number' && value) {
                                            // Remove currency symbols, "MWh" suffix, etc.
                                            const numStr = String(value).replace(/[R$\sMWh]/g, '').replace('.', '').replace(',', '.');
                                            const num = parseFloat(numStr);
                                            return isNaN(num) ? '' : String(num);
                                          }
                                          // For text fields, just use the value
                                          return value;
                                        })()}
                                        onChange={(event) => {
                                          let newValue = event.target.value;
                                          // Convert date inputs back to display format for storage
                                          if (column.fieldType === 'date' || column.fieldType === 'datetime') {
                                            const converted = fromInputValue(newValue, column.fieldType);
                                            newValue = converted;
                                          }
                                          // For number fields, we store as-is (will be parsed on API call)
                                          else if (column.fieldType === 'number') {
                                            // Store the number as string, will be parsed in convertEmailRowToApiFormat
                                            newValue = newValue;
                                          }
                                          handleDraftChange(row.id, column.key, newValue);
                                        }}
                                        step={column.step}
                                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/30 sm:text-sm"
                                        aria-label={`Editar ${column.label} do registro ${row.id}`}
                                      />
                                    )
                                  ) : (
                                    <span className={`block text-xs font-semibold text-gray-700 sm:text-sm ${isReadOnly ? 'italic text-gray-500' : ''}`}>
                                      {row[column.key]}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center gap-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmEdit(row.id)}
                                      disabled={isUpdating}
                                      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white transition hover:brightness-110 ${
                                        isUpdating ? 'cursor-not-allowed opacity-60' : ''
                                      }`}
                                      aria-label="Confirmar alterações"
                                    >
                                      {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCancelEdit(row.id)}
                                      disabled={isUpdating}
                                      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-500 text-white transition hover:brightness-110 ${
                                        isUpdating ? 'cursor-not-allowed opacity-60' : ''
                                      }`}
                                      aria-label="Cancelar edição"
                                    >
                                      <X size={18} />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(row)}
                                    disabled={isUpdating}
                                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white transition hover:brightness-110 ${
                                      isUpdating ? 'cursor-not-allowed opacity-60' : ''
                                    }`}
                                    aria-label="Editar registro"
                                  >
                                    <Pencil size={18} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
