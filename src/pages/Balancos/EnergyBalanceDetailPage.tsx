import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getById, getEvents } from '../../services/energyBalanceApi';
import {
  normalizeEnergyBalanceDetail,
  normalizeEnergyBalanceEvent,
} from '../../utils/normalizers/energyBalance';
import type { EnergyBalanceDetail, EnergyBalanceEvent } from '../../types/energyBalance';
import type { EmailRow } from '../../types/email';
import {
  convertDisplayRowToEnergyBalancePayload,
  sanitizeDisplayValue,
  type DisplayEnergyBalanceRow,
} from '../../utils/energyBalancePayload';
import { updateEmailRow } from '../../services/emailApi';
import EmailDispatchApprovalCard from '../../components/balancos/EmailDispatchApprovalCard';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

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

const parseEventDate = (value: unknown): string => {
  if (!value) return 'Data não informada';
  const text = String(value);
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    try {
      return dateTimeFormatter.format(parsed).replace('.', '');
    } catch (error) {
      console.warn('[EnergyBalanceDetail] falha ao formatar data de evento', error);
    }
  }
  return text;
};

type EditableMonthColumn = {
  key: keyof EmailRow;
  label: string;
  editable?: boolean;
  inputType?: 'text' | 'email' | 'select' | 'datetime-local';
  minWidth?: string;
  required?: boolean;
};

const booleanSelectOptions = [
  { label: 'Selecione', value: '' },
  { label: 'Sim', value: 'Sim' },
  { label: 'Não', value: 'Não' },
];

const monthColumns: EditableMonthColumn[] = [
  { key: 'preco', label: 'Preço', editable: true, inputType: 'text', minWidth: 'min-w-[120px]' },
  { key: 'dataBase', label: 'Data-base', editable: false, minWidth: 'min-w-[140px]' },
  { key: 'reajustado', label: 'Reajustado', editable: true, inputType: 'select', minWidth: 'min-w-[120px]' },
  { key: 'fornecedor', label: 'Fornecedor', editable: true, inputType: 'text', minWidth: 'min-w-[150px]' },
  { key: 'medidor', label: 'Medidor', editable: true, inputType: 'text', minWidth: 'min-w-[150px]' },
  { key: 'consumo', label: 'Consumo', editable: true, inputType: 'text', minWidth: 'min-w-[120px]' },
  { key: 'perdas3', label: 'Perdas (3%)', editable: true, inputType: 'text', minWidth: 'min-w-[120px]' },
  { key: 'requisito', label: 'Requisito', editable: true, inputType: 'text', minWidth: 'min-w-[120px]' },
  { key: 'net', label: 'NET', editable: true, inputType: 'text', minWidth: 'min-w-[120px]' },
  { key: 'medicao', label: 'Medição', editable: true, inputType: 'text', minWidth: 'min-w-[120px]' },
  { key: 'proinfa', label: 'Proinfa', editable: true, inputType: 'text', minWidth: 'min-w-[120px]', required: true },
  { key: 'contrato', label: 'Contrato', editable: true, inputType: 'text', minWidth: 'min-w-[140px]' },
  { key: 'minimo', label: 'Mínimo', editable: true, inputType: 'text', minWidth: 'min-w-[120px]' },
  { key: 'maximo', label: 'Máximo', editable: true, inputType: 'text', minWidth: 'min-w-[120px]' },
  { key: 'faturar', label: 'Faturar', editable: true, inputType: 'text', minWidth: 'min-w-[120px]' },
  { key: 'cp', label: 'CP', editable: true, inputType: 'text', minWidth: 'min-w-[110px]' },
  { key: 'email', label: 'Email', editable: true, inputType: 'email', minWidth: 'min-w-[160px]' },
  { key: 'envioOk', label: 'Envio ok', editable: true, inputType: 'select', minWidth: 'min-w-[130px]' },
  { key: 'disparo', label: 'Disparo', editable: false, minWidth: 'min-w-[160px]' },
  {
    key: 'dataVencimentoBoleto',
    label: 'Data vencimento boleto',
    editable: true,
    inputType: 'datetime-local',
    minWidth: 'min-w-[200px]',
  },
];

const toInputCompatibleValue = (value: string, inputType?: EditableMonthColumn['inputType']): string => {
  if (!value) return '';

  if (inputType === 'datetime-local' || inputType === 'select') {
    if (inputType === 'select') return value;
    if (value.includes('/')) {
      const [datePart, timePartRaw] = value.split(' ');
      if (datePart.includes('/')) {
        const [day, month, year] = datePart.split('/');
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const timePart = timePartRaw ? timePartRaw.slice(0, 5) : '00:00';
        return `${isoDate}T${timePart}`;
      }
    }
    if (value.includes('T')) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 16);
      }
      return value.slice(0, 16);
    }
  }

  return value;
};

const prepareEditableValue = (field: keyof EmailRow, value: string | undefined): string => {
  const sanitized = sanitizeDisplayValue(value);
  if (!sanitized) return '';

  if (['preco', 'net', 'faturar', 'proinfa'].includes(field)) {
    return sanitized.replace(/R\$\s*/gi, '').trim();
  }
  if (['consumo', 'minimo', 'maximo'].includes(field)) {
    return sanitized.replace(/MWh/gi, '').trim();
  }
  if (field === 'perdas3') {
    return sanitized.replace(/%/g, '').trim();
  }
  return sanitized;
};

const createEditableRow = (
  detail: EnergyBalanceDetail,
  month: EnergyBalanceDetail['months'][number],
): EmailRow => ({
  id: month.id,
  clientes: sanitizeDisplayValue(detail.cliente || detail.header.razao) || detail.header.razao || detail.cliente || '',
  preco: prepareEditableValue('preco', month.precoReaisPorMWh),
  dataBase: month.mes,
  reajustado: sanitizeDisplayValue(month.ajustado),
  fornecedor: sanitizeDisplayValue(month.fornecedor),
  medidor: sanitizeDisplayValue(month.medidor),
  consumo: prepareEditableValue('consumo', month.consumoMWh),
  perdas3: prepareEditableValue('perdas3', month.perdas3),
  requisito: sanitizeDisplayValue(month.requisito),
  net: prepareEditableValue('net', month.net),
  medicao: sanitizeDisplayValue(month.medicao),
  proinfa: prepareEditableValue('proinfa', month.proinfa),
  contrato: sanitizeDisplayValue(month.contrato),
  minimo: prepareEditableValue('minimo', month.minimo),
  maximo: prepareEditableValue('maximo', month.maximo),
  faturar: prepareEditableValue('faturar', month.faturar),
  cp: sanitizeDisplayValue(month.codigoCP),
  email: sanitizeDisplayValue(month.email),
  envioOk: sanitizeDisplayValue(month.envioOk),
  disparo: sanitizeDisplayValue(month.disparo),
  dataVencimentoBoleto: sanitizeDisplayValue(month.dataVencimentoBoleto),
});

const extractRawMonthMapping = (
  normalized: EnergyBalanceDetail,
  raw: Record<string, unknown>,
) => {
  const mapping: Record<string, Record<string, unknown>> = {};
  const rawMonthsCandidates = ['months', 'data', 'items', 'balances'];

  for (const key of rawMonthsCandidates) {
    const candidate = raw[key];
    if (Array.isArray(candidate)) {
      normalized.months.forEach((month, index) => {
        const item = candidate[index];
        if (item && typeof item === 'object') {
          mapping[month.id] = item as Record<string, unknown>;
        }
      });
      if (Object.keys(mapping).length) {
        return mapping;
      }
    }
  }

  normalized.months.forEach((month) => {
    if (!mapping[month.id]) {
      mapping[month.id] = raw;
    }
  });

  return mapping;
};

const mergeMonthWithEmailRow = (
  month: EnergyBalanceDetail['months'][number],
  updates: Partial<EmailRow>,
) => ({
  ...month,
  precoReaisPorMWh: updates.preco ?? month.precoReaisPorMWh,
  ajustado: updates.reajustado ?? month.ajustado,
  fornecedor: updates.fornecedor ?? month.fornecedor,
  medidor: updates.medidor ?? month.medidor,
  consumoMWh: updates.consumo ?? month.consumoMWh,
  perdas3: updates.perdas3 ?? month.perdas3,
  requisito: updates.requisito ?? month.requisito,
  net: updates.net ?? month.net,
  medicao: updates.medicao ?? month.medicao,
  proinfa: updates.proinfa ?? month.proinfa,
  contrato: updates.contrato ?? month.contrato,
  minimo: updates.minimo ?? month.minimo,
  maximo: updates.maximo ?? month.maximo,
  faturar: updates.faturar ?? month.faturar,
  codigoCP: updates.cp ?? month.codigoCP,
  email: updates.email ?? month.email,
  envioOk: updates.envioOk ?? month.envioOk,
  disparo: updates.disparo ?? month.disparo,
  dataVencimentoBoleto: updates.dataVencimentoBoleto ?? month.dataVencimentoBoleto,
});

export default function EnergyBalanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = React.useState<EnergyBalanceDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const detailControllerRef = React.useRef<AbortController | null>(null);

  const [rawDetail, setRawDetail] = React.useState<Record<string, unknown> | null>(null);
  const [rawMonthMap, setRawMonthMap] = React.useState<Record<string, Record<string, unknown>>>({});
  const [editableRows, setEditableRows] = React.useState<Record<string, EmailRow>>({});
  const [dirtyRows, setDirtyRows] = React.useState<string[]>([]);
  const dirtyRowsRef = React.useRef<string[]>([]);
  const [savingRowId, setSavingRowId] = React.useState<string | null>(null);

  const [events, setEvents] = React.useState<EnergyBalanceEvent[]>([]);
  const [eventsLoading, setEventsLoading] = React.useState(true);
  const [eventsError, setEventsError] = React.useState('');
  const eventsControllerRef = React.useRef<AbortController | null>(null);

  const fetchDetail = React.useCallback(async () => {
    if (!id) return;
    detailControllerRef.current?.abort();
    const controller = new AbortController();
    detailControllerRef.current = controller;
    setLoading(true);
    setError('');
    setRawDetail(null);
    setRawMonthMap({});
    setEditableRows({});
    setDirtyRows([]);
    try {
      const payload = await getById(id, controller.signal);
      const rawRecord =
        payload && typeof payload === 'object' && !Array.isArray(payload)
          ? (payload as Record<string, unknown>)
          : {};
      setRawDetail(rawRecord);

      const normalized = normalizeEnergyBalanceDetail(payload);
      const monthMap = extractRawMonthMapping(normalized, rawRecord);
      setRawMonthMap(monthMap);
      setDetail(normalized);

      const initialRows = normalized.months.reduce<Record<string, EmailRow>>((acc, month) => {
        acc[month.id] = createEditableRow(normalized, month);
        return acc;
      }, {});
      setEditableRows(initialRows);
    } catch (fetchError) {
      if (controller.signal.aborted) {
        return;
      }
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Não foi possível carregar o balanço energético selecionado.';
      setError(message);
      console.error('[EnergyBalanceDetail] Erro ao buscar balanço', fetchError);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [id]);

  const fetchEvents = React.useCallback(async () => {
    if (!id) {
      setEvents([]);
      setEventsLoading(false);
      return;
    }
    eventsControllerRef.current?.abort();
    const controller = new AbortController();
    eventsControllerRef.current = controller;
    setEventsLoading(true);
    setEventsError('');
    try {
      const payload = await getEvents(id, controller.signal);
      const array = Array.isArray(payload) ? payload : [];
      const normalizedEvents = array.map((item, index) => {
        const normalized = normalizeEnergyBalanceEvent(item, index);
        return {
          ...normalized,
          createdAt: parseEventDate(normalized.createdAt),
        };
      });
      setEvents(normalizedEvents);
    } catch (fetchError) {
      if (controller.signal.aborted) {
        return;
      }
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Não foi possível carregar a linha do tempo deste balanço.';
      setEventsError(message);
      console.warn('[EnergyBalanceDetail] Erro ao buscar eventos', fetchError);
      setEvents([]);
    } finally {
      if (!controller.signal.aborted) {
        setEventsLoading(false);
      }
    }
  }, [id]);

  React.useEffect(() => {
    void fetchDetail();
    return () => {
      detailControllerRef.current?.abort();
    };
  }, [fetchDetail]);

  React.useEffect(() => {
    void fetchEvents();
    return () => {
      eventsControllerRef.current?.abort();
    };
  }, [fetchEvents]);

  React.useEffect(() => {
    dirtyRowsRef.current = dirtyRows;
  }, [dirtyRows]);

  React.useEffect(() => {
    if (!detail) {
      setEditableRows({});
      setDirtyRows([]);
      return;
    }

    setEditableRows((prev) => {
      const detailIds = new Set(detail.months.map((month) => month.id));
      const nextRows: Record<string, EmailRow> = {};
      let hasChanges = false;
      const dirtySnapshot = dirtyRowsRef.current;

      detail.months.forEach((month) => {
        const existingRow = prev[month.id];
        if (existingRow && dirtySnapshot.includes(month.id)) {
          nextRows[month.id] = existingRow;
        } else {
          const rebuiltRow = createEditableRow(detail, month);
          nextRows[month.id] = rebuiltRow;
          if (existingRow) {
            hasChanges = true;
          }
        }
        if (!existingRow) {
          hasChanges = true;
        }
      });

      Object.keys(prev).forEach((rowId) => {
        if (!detailIds.has(rowId)) {
          hasChanges = true;
        }
      });

      return hasChanges ? nextRows : prev;
    });

    const dirtySnapshot = dirtyRowsRef.current;
    const filteredDirtyRows = dirtySnapshot.filter((rowId) =>
      detail.months.some((month) => month.id === rowId),
    );
    if (filteredDirtyRows.length !== dirtySnapshot.length) {
      setDirtyRows(filteredDirtyRows);
    }
  }, [detail]);

  const handleFieldChange = React.useCallback(
    (rowId: string, field: keyof EmailRow, value: string, baseRow?: EmailRow) => {
      setEditableRows((prev) => {
        const current = prev[rowId] ?? baseRow ?? ({} as EmailRow);
        return {
          ...prev,
          [rowId]: {
            ...current,
            [field]: value,
          },
        };
      });
      setDirtyRows((prev) => (prev.includes(rowId) ? prev : [...prev, rowId]));
    },
    [],
  );

  const handleSaveRow = React.useCallback(
    async (rowId: string) => {
      const row = editableRows[rowId];
      if (!row) {
        toast.error('Nenhum dado encontrado para salvar.');
        return;
      }

      const originalRaw = rawMonthMap[rowId] ?? rawDetail ?? undefined;

      setSavingRowId(rowId);
      try {
        const payload = convertDisplayRowToEnergyBalancePayload(row, originalRaw);
        const response = await updateEmailRow(rowId, payload);

        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const record = response as Record<string, unknown>;
          setRawDetail((prev) => ({ ...(prev ?? {}), ...record }));
          setRawMonthMap((prev) => ({ ...prev, [rowId]: record }));
        } else if (originalRaw && typeof originalRaw === 'object') {
          setRawMonthMap((prev) => ({ ...prev, [rowId]: originalRaw as Record<string, unknown> }));
        }

        setDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            months: prev.months.map((month) =>
              month.id === rowId ? mergeMonthWithEmailRow(month, row) : month,
            ),
          };
        });

        setEditableRows((prev) => ({
          ...prev,
          [rowId]: {
            ...(prev[rowId] ?? row),
            ...row,
          },
        }));

        setDirtyRows((prev) => prev.filter((item) => item !== rowId));
        toast.success('Dados do mês atualizados com sucesso!');
      } catch (saveError) {
        console.error('[EnergyBalanceDetail] Erro ao salvar balanço mensal', saveError);
        toast.error('Não foi possível salvar as alterações deste mês.');
      } finally {
        setSavingRowId(null);
      }
    },
    [editableRows, rawDetail, rawMonthMap],
  );

  const handleEmailDispatchSuccess = React.useCallback(
    (updatedRow: DisplayEnergyBalanceRow, response?: Record<string, unknown>) => {
      const rowId = updatedRow.id ?? detail?.months[0]?.id;
      if (!rowId) {
        return;
      }

      const monthForRow = detail?.months.find((item) => item.id === rowId);
      const partial: Partial<EmailRow> = {
        envioOk: updatedRow.envioOk,
        disparo: updatedRow.disparo,
      };

      setEditableRows((prev) => ({
        ...prev,
        [rowId]: {
          ...(prev[rowId] ?? (monthForRow && detail ? createEditableRow(detail, monthForRow) : ({} as EmailRow))),
          ...partial,
        },
      }));

      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          months: prev.months.map((item) => (item.id === rowId ? mergeMonthWithEmailRow(item, partial) : item)),
        };
      });

      if (response && typeof response === 'object') {
        setRawDetail((prev) => ({ ...(prev ?? {}), ...response }));
        setRawMonthMap((prev) => ({ ...prev, [rowId]: response }));
      }

      setDirtyRows((prev) => prev.filter((item) => item !== rowId));
    },
    [detail],
  );

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
          Carregando balanço energético...
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
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void fetchDetail()}
            className="inline-flex items-center justify-center rounded-lg bg-yn-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-6 p-4">
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
          Nenhum balanço energético encontrado.
        </div>
        <div className="flex justify-center gap-2">
          <Link
            to="/balancos"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:border-yn-orange hover:text-yn-orange"
          >
            Voltar para balanços
          </Link>
          <Link
            to="/contratos"
            className="inline-flex items-center justify-center rounded-lg border border-yn-orange px-4 py-2 text-sm font-bold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
          >
            Voltar para contratos
          </Link>
        </div>
      </div>
    );
  }

  const contractLink = detail.header.contractId ? `/contratos/${detail.header.contractId}` : null;
  const primaryMonth = detail.months[0] ?? null;
  const primaryMonthRow = primaryMonth
    ? editableRows[primaryMonth.id] ?? createEditableRow(detail, primaryMonth)
    : null;
  const primaryMonthRaw = primaryMonth
    ? rawMonthMap[primaryMonth.id] ?? rawDetail ?? undefined
    : rawDetail ?? undefined;

  return (
    <div className="space-y-6 p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Balanço Energético · {detail.header.titleSuffix || '-'}
          </h1>
          <p className="text-sm font-bold text-gray-600 dark:text-white">
            {detail.header.razao} · CNPJ {detail.header.cnpj || 'Não informado'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {contractLink ? (
            <Link
              to={contractLink}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm font-bold text-gray-700 dark:text-white transition hover:border-yn-orange hover:text-yn-orange"
            >
              Ver Contrato
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-bold text-gray-400">
              Ver Contrato
            </span>
          )}
          <Link
            to="/contratos"
            className="inline-flex items-center justify-center rounded-lg border border-yn-orange px-4 py-2 text-sm font-bold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
          >
            Voltar para contratos
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Consumo total (MWh)</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{detail.metrics.consumoTotalMWh}</div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Custo total (R$)</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{detail.metrics.custoTotalBRL}</div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">PROINFA total</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{detail.metrics.proinfaTotal}</div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-auto">
          <table className="min-w-full table-auto text-xs">
            <thead className="bg-yn-orange text-white text-xs font-bold uppercase tracking-wide">
              <tr>
                {monthColumns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-2 py-3 text-left ${column.minWidth ?? ''}`}
                  >
                    {column.label}
                    {column.required ? <span className="ml-1 text-red-200">*</span> : null}
                  </th>
                ))}
                <th className="px-2 py-3 text-left min-w-[140px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {detail.months.length === 0 ? (
                <tr>
                  <td colSpan={monthColumns.length + 1} className="px-4 py-8 text-center text-sm font-bold text-gray-500">
                    Nenhum dado mensal disponível para este balanço.
                  </td>
                </tr>
              ) : (
                detail.months.map((month) => {
                  const baseRow = editableRows[month.id] ?? createEditableRow(detail, month);
                  const isRowDirty = dirtyRows.includes(month.id);

                  return (
                    <tr key={month.id} className="bg-white hover:bg-gray-50">
                      {monthColumns.map((column) => {
                        const rawValue = baseRow[column.key] ?? '';
                        const displayValue = rawValue || '';
                        const isRequiredMissing = column.required && displayValue.trim() === '';

                        if (!column.editable) {
                          let text = displayValue;
                          if (column.key === 'dataBase') {
                            text = month.mes || '-';
                          }
                          if (column.key === 'disparo') {
                            text = formatDate(displayValue || month.disparo || '');
                          }
                          return (
                            <td key={column.key} className={`px-2 py-3 text-xs font-semibold text-gray-900 ${column.minWidth ?? ''}`}>
                              {text && text.trim() !== '' ? text : '-'}
                            </td>
                          );
                        }

                        const inputValue = column.inputType === 'datetime-local'
                          ? toInputCompatibleValue(displayValue || month.dataVencimentoBoleto || '')
                          : displayValue;

                        const commonClasses = `w-full rounded-md border px-2 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 ${
                          isRequiredMissing
                            ? 'border-red-400 bg-red-50 text-red-700 placeholder:text-red-400 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-200 text-gray-900 focus:border-yn-orange focus:ring-yn-orange/40'
                        }`;

                        return (
                          <td key={column.key} className={`px-2 py-3 align-top ${column.minWidth ?? ''}`}>
                            {column.inputType === 'select' ? (
                              <select
                                value={displayValue}
                                onChange={(event) =>
                                  handleFieldChange(month.id, column.key, event.target.value, baseRow)
                                }
                                className={`${commonClasses} bg-white`}
                              >
                                {booleanSelectOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={
                                  column.inputType === 'email'
                                    ? 'email'
                                    : column.inputType === 'datetime-local'
                                      ? 'datetime-local'
                                      : 'text'
                                }
                                value={inputValue}
                                onChange={(event) =>
                                  handleFieldChange(month.id, column.key, event.target.value, baseRow)
                                }
                                placeholder={column.required ? 'Obrigatório' : undefined}
                                className={commonClasses}
                              />
                            )}
                            {column.required && isRequiredMissing ? (
                              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-red-600">
                                Preencha o PROINFA deste mês.
                              </p>
                            ) : null}
                          </td>
                        );
                      })}
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          onClick={() => void handleSaveRow(month.id)}
                          disabled={!isRowDirty || savingRowId === month.id}
                          className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition ${
                            !isRowDirty || savingRowId === month.id
                              ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                              : 'bg-yn-orange text-white hover:bg-yn-orange/90'
                          }`}
                        >
                          {savingRowId === month.id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...
                            </>
                          ) : (
                            'Salvar alterações'
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {primaryMonth ? (
        <EmailDispatchApprovalCard
          balanceId={id ?? null}
          row={primaryMonthRow}
          rawData={primaryMonthRaw ?? null}
          onSuccess={handleEmailDispatchSuccess}
        />
      ) : null}

      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Balanço Energético</h3>
          <p className="mt-1 text-xs font-bold text-gray-600">
            Linha do tempo mensal por medidor/cliente/contrato consolidando consumo, preço e encargos para cálculo,
            auditoria e geração de oportunidades.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900">Linha do tempo</h4>
            {eventsLoading && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-yn-orange">
                <Loader2 className="h-3 w-3 animate-spin" /> Carregando eventos...
              </span>
            )}
          </div>

          {eventsError && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-700">
              {eventsError}
            </div>
          )}

          {!eventsLoading && events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm font-bold text-gray-500">
              Sem eventos ainda
            </div>
          ) : null}

          {!eventsLoading && events.length > 0 && (
            <ol className="relative border-l border-gray-200 pl-6">
              {events.map((event, index) => (
                <li key={event.id || index} className="relative mb-6 last:mb-0">
                  <span className="absolute -left-[13px] top-1.5 h-3 w-3 rounded-full bg-yn-orange" />
                  <div className="text-sm font-bold text-gray-900">{event.title}</div>
                  <div className="mt-1 text-xs font-bold text-gray-500">
                    {event.createdAt} · {event.user}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {eventsLoading && events.length === 0 && !eventsError && (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm font-bold text-gray-500">
              Carregando eventos...
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
