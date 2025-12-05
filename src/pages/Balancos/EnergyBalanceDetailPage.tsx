import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getById, energyBalanceRequest } from '../../services/energyBalanceApi';
import {
  normalizeEnergyBalanceDetail,
  // normalizeEnergyBalanceEvent, // Removido - endpoint /events não existe
} from '../../utils/normalizers/energyBalance';
import type { EnergyBalanceDetail, EnergyBalanceEvent } from '../../types/energyBalance';
import type { EmailRow } from '../../types/email';
import {
  convertDisplayRowToEnergyBalancePayload,
  sanitizeDisplayValue,
  type DisplayEnergyBalanceRow,
} from '../../utils/energyBalancePayload';
import EmailDispatchApprovalCard from '../../components/balancos/EmailDispatchApprovalCard';
import VolumeContratadoModal from '../../components/balancos/VolumeContratadoModal';
import { useContracts } from '../contratos/ContractsContext';
import { parseContractPricePeriods } from '../../utils/contractPricing';

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

const formatDateTime = (dateStr: string | undefined | null): string => {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '' || dateStr === 'Não disparado' || dateStr === 'Não informado') {
    return 'Não disparado';
  }
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    // Formata data e hora em pt-BR
    const formatted = date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return formatted || dateStr;
  } catch (error) {
    console.warn('[EnergyBalanceDetail] falha ao formatar data/hora:', error, dateStr);
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

type SelectOption = {
  label: string;
  value: string;
};

type EditableMonthColumn = {
  key: keyof EmailRow;
  label: string;
  editable?: boolean;
  inputType?: 'text' | 'email' | 'select' | 'datetime-local';
  minWidth?: string;
  required?: boolean;
  selectOptions?: SelectOption[];
};

const booleanSelectOptions: SelectOption[] = [
  { label: 'Selecione', value: '' },
  { label: 'Sim', value: 'Sim' },
  { label: 'Não', value: 'Não' },
];

const supplierSelectOptions: SelectOption[] = [
  { label: 'Selecione', value: '' },
  { label: 'Boven Energia', value: 'Boven Energia' },
  { label: 'Serena Energia', value: 'Serena Energia' },
  { label: 'Bolt Energy', value: 'Bolt Energy' },
  { label: 'Matrix Energia', value: 'Matrix Energia' },
  { label: 'Voltta', value: 'Voltta' },
  { label: 'Newave', value: 'Newave' },
  { label: 'Auren', value: 'Auren' },
];

const reajustedCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const parseCurrencyCandidate = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed
      .replace(/[R$\s]/gi, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(',', '.');
    const numeric = Number.parseFloat(normalized);
    return Number.isNaN(numeric) ? null : numeric;
  }
  return null;
};

const formatReajustedCurrency = (value: number): string => {
  try {
    return reajustedCurrencyFormatter.format(value);
  } catch (error) {
    console.warn('[EnergyBalanceDetail] falha ao formatar preço reajustado', error);
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  }
};

const deriveReajustedDisplayValue = (
  month: EnergyBalanceDetail['months'][number],
  rawMonth?: Record<string, unknown> | null,
): string => {
  const candidates: unknown[] = [];

  if (rawMonth) {
    const candidateKeys = [
      'reajuted_price',
      'reajusted_price',
      'reajustedPrice',
      'reajutedPrice',
      'price_reajusted',
      'priceReajusted',
      'price_adjusted',
      'priceAdjusted',
      'adjusted_price',
      'adjustedPrice',
      'precoReajustado',
      'preco_reajustado',
    ];
    for (const key of candidateKeys) {
      if (Object.prototype.hasOwnProperty.call(rawMonth, key)) {
        candidates.push(rawMonth[key]);
      }
    }
  }

  candidates.push(month.ajustado);

  for (const candidate of candidates) {
    const numeric = parseCurrencyCandidate(candidate);
    if (numeric !== null) {
      return formatReajustedCurrency(numeric);
    }
  }

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return '';
};

const monthColumns: EditableMonthColumn[] = [
  { key: 'preco', label: 'Preço', editable: true, inputType: 'text', minWidth: 'min-w-[120px]' },
  { key: 'dataBase', label: 'Data-base', editable: false, minWidth: 'min-w-[140px]' },
  {
    key: 'reajustado',
    label: 'Preço reajustado (R$)',
    editable: false,
    inputType: 'text',
    minWidth: 'min-w-[160px]',
  },
  { key: 'fornecedor', label: 'Fornecedor', editable: true, inputType: 'select', minWidth: 'min-w-[150px]', selectOptions: supplierSelectOptions },
  { key: 'medidor', label: 'Medidor', editable: true, inputType: 'text', minWidth: 'min-w-[150px]' },
  { key: 'consumo', label: 'Consumo', editable: true, inputType: 'text', minWidth: 'min-w-[120px]' },
  { key: 'perdas3', label: 'Perdas (3%)', editable: true, inputType: 'text', minWidth: 'min-w-[120px]' },
  { key: 'requisito', label: 'Requisito', editable: true, inputType: 'text', minWidth: 'min-w-[120px]' },
  { key: 'net', label: 'NET', editable: true, inputType: 'text', minWidth: 'min-w-[120px]' },
  { key: 'medicao', label: 'Medição', editable: true, inputType: 'text', minWidth: 'min-w-[120px]' },
  { key: 'proinfa', label: 'Proinfa (MWh)', editable: true, inputType: 'text', minWidth: 'min-w-[120px]', required: true },
  { key: 'contrato', label: 'Volume contratado (MWh)', editable: true, inputType: 'text', minWidth: 'min-w-[140px]' },
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

  if (['preco', 'net', 'faturar', 'proinfa', 'reajustado'].includes(field)) {
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

// Helper simples para extrair valor bruto do rawMonth (SEM conversões, SEM cálculos)
const getRawValueDirect = (
  rawMonth: Record<string, unknown> | null | undefined,
  keys: string[],
): string => {
  if (!rawMonth) return '';
  
  for (const key of keys) {
    const value = rawMonth[key];
    if (value !== null && value !== undefined) {
      // Se for string vazia, continuar procurando
      if (typeof value === 'string' && value === '') {
        continue;
      }
      // Preservar valor exato - se for número, usar toString() para preservar todas as casas decimais
      if (typeof value === 'number') {
        // Converter para string preservando todas as casas decimais, depois converter ponto para vírgula
        const str = value.toString();
        return str.replace('.', ',');
      }
      // Se for string, preservar como está (apenas converter ponto para vírgula se necessário)
      const strValue = String(value);
      if (strValue.includes('.')) {
        return strValue.replace('.', ',');
      }
      return strValue;
    }
  }
  return '';
};

const createEditableRow = (
  detail: EnergyBalanceDetail,
  month: EnergyBalanceDetail['months'][number],
  rawMonth?: Record<string, unknown> | null,
): EmailRow => {
  // EXTRAIR TODOS OS VALORES DIRETAMENTE DO rawMonth (SEM CONVERSÕES, SEM CÁLCULOS)
  // Apenas converter para string quando necessário
  
  const id = rawMonth ? String(rawMonth['id'] ?? month.id) : month.id;
  const clientes = rawMonth ? String(rawMonth['clientName'] ?? rawMonth['client_name'] ?? detail.cliente ?? detail.header.razao ?? '') : (detail.cliente || detail.header.razao || '');
  const preco = getRawValueDirect(rawMonth, ['price', 'preco', 'tarifa']);
  const dataBase = getRawValueDirect(rawMonth, ['referenceBase', 'reference_base', 'competencia', 'month', 'mes']) || month.mes;
  const reajustado = getRawValueDirect(rawMonth, ['reajutedPrice', 'reajuted_price', 'reajustedPrice', 'reajusted_price', 'priceReajusted']);
  const fornecedor = getRawValueDirect(rawMonth, ['supplier', 'fornecedor', 'provider']);
  const medidor = getRawValueDirect(rawMonth, ['meter', 'medidor', 'meter_code']);
  const consumo = getRawValueDirect(rawMonth, ['consumptionKwh', 'consumption_kwh', 'consumo_kwh', 'consumo']);
  const perdas3 = getRawValueDirect(rawMonth, ['loss', 'perdas', 'losses']);
  const requisito = getRawValueDirect(rawMonth, ['requirement', 'requisito', 'req']);
  const net = getRawValueDirect(rawMonth, ['net', 'net_value', 'valorLiquido']);
  const medicao = getRawValueDirect(rawMonth, ['statusMeasurement', 'status_measurement', 'medicao', 'measurement']);
  const proinfa = getRawValueDirect(rawMonth, ['proinfaContribution', 'proinfa_contribution', 'proinfa']);
  const contrato = getRawValueDirect(rawMonth, ['contract', 'contrato', 'contractCode']);
  const minimo = getRawValueDirect(rawMonth, ['minDemand', 'min_demand', 'minimo', 'min']);
  const maximo = getRawValueDirect(rawMonth, ['maxDemand', 'max_demand', 'maximo', 'max']);
  const faturar = getRawValueDirect(rawMonth, ['billable', 'faturar', 'bill']);
  const cp = getRawValueDirect(rawMonth, ['cpCode', 'cp_code', 'contaParticipacao']);
  const email = getRawValueDirect(rawMonth, ['email', 'emails', 'destinatario']);
  const sentOk = rawMonth ? (rawMonth['sentOk'] ?? rawMonth['sent_ok'] ?? '') : '';
  const envioOk = sentOk !== '' ? String(sentOk) : '';
  const disparo = getRawValueDirect(rawMonth, ['sendDate', 'send_date', 'disparo', 'sentAt']);
  const dataVencimentoBoleto = getRawValueDirect(rawMonth, ['billsDate', 'bills_date', 'dataVencimento', 'vencimento', 'due_date']);

  return {
    id,
    clientes,
    preco,
    dataBase,
    reajustado,
    fornecedor,
    medidor,
    consumo,
    perdas3,
    requisito,
    net,
    medicao,
    proinfa,
    contrato,
    minimo,
    maximo,
    faturar,
    cp,
    email,
    envioOk,
    disparo,
    dataVencimentoBoleto,
  };
};

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

// Componente para exibir emails de forma bonita quando houver múltiplos
type EmailDisplayProps = {
  emails: string | undefined | null;
};

const EmailDisplay: React.FC<EmailDisplayProps> = ({ emails }) => {
  if (!emails || typeof emails !== 'string' || emails.trim() === '' || emails === '-' || emails === 'Não informado') {
    return <div className="mt-3 text-xl font-bold text-gray-900">-</div>;
  }

  // Separa os emails por ponto e vírgula ou vírgula, remove espaços e filtra vazios
  const emailList = emails
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0);

  // Se não houver emails válidos após a separação
  if (emailList.length === 0) {
    return <div className="mt-3 text-xl font-bold text-gray-900">-</div>;
  }

  // Se houver apenas um email, exibe normalmente
  if (emailList.length === 1) {
    return <div className="mt-3 text-xl font-bold text-gray-900">{emailList[0]}</div>;
  }

  // Se houver múltiplos emails, exibe em chips
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {emailList.map((email, index) => (
          <div
            key={`email-${index}`}
            className="inline-flex items-center rounded-lg border border-yn-orange/30 bg-yn-orange/5 px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-yn-orange/50 hover:bg-yn-orange/10"
          >
            <span className="mr-2 text-yn-orange">âœ‰</span>
            {email}
          </div>
        ))}
      </div>
    </div>
  );
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
  const { getContractById, contracts, isLoading: contractsLoading } = useContracts();
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

  // Events removidos - endpoint não existe na API
  // const [events, setEvents] = React.useState<EnergyBalanceEvent[]>([]);
  // const [eventsLoading, setEventsLoading] = React.useState(true);
  // const [eventsError, setEventsError] = React.useState('');
  // const eventsControllerRef = React.useRef<AbortController | null>(null);

  const proinfaInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  
  const [editingField, setEditingField] = React.useState<string | null>(null);
  const [fieldInputValue, setFieldInputValue] = React.useState('');
  const fieldInputRef = React.useRef<any>(null); // Ref genérico para múltiplos tipos de input
  
  // Estado para controlar qual mês está selecionado
  const [selectedMonthId, setSelectedMonthId] = React.useState<string | null>(null);
  
  // Estado para controlar o modal de Volume Contratado
  const [isVolumeModalOpen, setIsVolumeModalOpen] = React.useState(false);

  React.useEffect(() => () => {
    proinfaInputRefs.current = {};
  }, []);

  // Inicializar o mês selecionado quando os dados carregarem
  React.useEffect(() => {
    if (!detail || detail.months.length === 0) return;
    // Se ainda não há mês selecionado, selecionar o primeiro
    if (selectedMonthId === null) {
      setSelectedMonthId(detail.months[0].id);
    }
    // Se o mês selecionado não existe mais, selecionar o primeiro disponível
    else if (!detail.months.some(m => m.id === selectedMonthId)) {
      setSelectedMonthId(detail.months[0].id);
    }
  }, [detail, selectedMonthId]);

  // Log dos dados exibidos nos cards - DEVE estar ANTES de qualquer return condicional
  // Usando rawMonthMap (dados brutos da API) em vez de primaryMonthRow
  React.useEffect(() => {
    if (!detail || !detail.months[0] || !selectedMonthId) return;
    const selectedMonth = detail.months.find(m => m.id === selectedMonthId) ?? detail.months[0];
    const monthMapData = rawMonthMap[selectedMonth.id] ?? rawDetail ?? null;
    
    if (monthMapData && typeof monthMapData === 'object') {
      const raw = monthMapData as Record<string, unknown>;
      
      // Extrair valores diretamente do rawMonthMap
      const consumptionKwh = raw['consumptionKwh'] ?? raw['consumption_kwh'] ?? raw['consumo_kwh'];
      const loss = raw['loss'] ?? raw['perdas'];
      const requirement = raw['requirement'] ?? raw['requisito'];
      const net = raw['net'] ?? raw['net_value'];
      const statusMeasurement = raw['statusMeasurement'] ?? raw['status_measurement'] ?? raw['medicao'];
      const minDemand = raw['minDemand'] ?? raw['min_demand'] ?? raw['minimo'];
      const maxDemand = raw['maxDemand'] ?? raw['max_demand'] ?? raw['maximo'];
      const billable = raw['billable'] ?? raw['faturar'];
      const email = raw['email'] ?? raw['emails'];
      const sentOk = raw['sentOk'] ?? raw['sent_ok'] ?? raw['envioOk'];
      const sendDate = raw['sendDate'] ?? raw['send_date'] ?? raw['disparo'];
      const billsDate = raw['billsDate'] ?? raw['bills_date'] ?? raw['dataVencimento'];
      
    }
  }, [detail, rawMonthMap, rawDetail]);

  const normalizeProinfaForValidation = React.useCallback((raw: string | undefined): string => {
    if (!raw) return '';
    return raw
      .replace(/\s+/g, '')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '');
  }, []);

  const isProinfaValueMissing = React.useCallback((raw: string | undefined): boolean => {
    const normalized = normalizeProinfaForValidation(raw);
    if (!normalized) return true;
    const numeric = Number.parseFloat(normalized);
    if (Number.isNaN(numeric)) return true;
    return numeric <= 0;
  }, [normalizeProinfaForValidation]);

  const monthsMissingProinfa = React.useMemo(() => {
    if (!detail) return [];
    return detail.months.filter((month) => {
      const rawMonth = rawMonthMap[month.id] ?? rawDetail ?? null;
      const baseRow = editableRows[month.id] ?? createEditableRow(detail, month, rawMonth);
      return isProinfaValueMissing(baseRow.proinfa);
    });
  }, [detail, editableRows, rawDetail, rawMonthMap, isProinfaValueMissing]);

  const hasMissingProinfa = monthsMissingProinfa.length > 0;

  const handleFocusFirstMissingProinfa = React.useCallback(() => {
    const firstMissingId = monthsMissingProinfa[0]?.id;
    if (!firstMissingId) return;
    const input = proinfaInputRefs.current[firstMissingId];
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [monthsMissingProinfa]);

  React.useEffect(() => {
    if (!hasMissingProinfa) return;
    handleFocusFirstMissingProinfa();
  }, [hasMissingProinfa, handleFocusFirstMissingProinfa]);


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
        const rawMonth = monthMap[month.id] ?? rawRecord ?? null;
        const editableRow = createEditableRow(normalized, month, rawMonth);
        acc[month.id] = editableRow;
        return acc;
      }, {});
      setEditableRows(initialRows);
    } catch (fetchError) {
      if (controller.signal.aborted) {
        return;
      }
      setRawDetail(null);
      setRawMonthMap({});
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

  // fetchEvents removido - endpoint não existe na API
  /*
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
  */

  React.useEffect(() => {
    void fetchDetail();
    return () => {
      detailControllerRef.current?.abort();
    };
  }, [fetchDetail]);

  // useEffect para fetchEvents removido - endpoint não existe
  /*
  React.useEffect(() => {
    void fetchEvents();
    return () => {
      eventsControllerRef.current?.abort();
    };
  }, [fetchEvents]);
  */

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
          const rawMonth = rawMonthMap[month.id] ?? rawDetail ?? null;
          const rebuiltRow = createEditableRow(detail, month, rawMonth);
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
  }, [detail, rawDetail, rawMonthMap]);

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
        const response = await energyBalanceRequest(`/energy-balance/${rowId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify(payload),
        });

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

      const rawMonth = rawMonthMap[rowId] ?? rawDetail ?? null;

      setEditableRows((prev) => ({
        ...prev,
        [rowId]: {
          ...(prev[rowId] ?? (monthForRow && detail ? createEditableRow(detail, monthForRow, rawMonth) : ({} as EmailRow))),
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
    [detail, rawDetail, rawMonthMap],
  );

  const handleStartEditingField = React.useCallback((field: keyof EmailRow | 'proinfaTotal', currentValue: string) => {
    setEditingField(field);
    setFieldInputValue(currentValue);
    setTimeout(() => {
      fieldInputRef.current?.focus();
      fieldInputRef.current?.select();
    }, 0);
  }, []);

  const handleCancelEditingField = React.useCallback(() => {
    setEditingField(null);
    setFieldInputValue('');
  }, []);

  const handleSaveField = React.useCallback(async (field: keyof EmailRow) => {
    if (!detail || !selectedMonthId) return;

    const primaryMonth = detail.months.find(m => m.id === selectedMonthId) ?? detail.months[0];
    const primaryMonthRaw = rawMonthMap[primaryMonth.id] ?? rawDetail ?? null;
    const primaryMonthRow = editableRows[primaryMonth.id] ?? createEditableRow(detail, primaryMonth, primaryMonthRaw);
    
    if (!primaryMonthRow) return;

    const rowId = primaryMonth.id;
    const updatedRow: EmailRow = {
      ...primaryMonthRow,
      [field]: fieldInputValue,
    };

    setSavingRowId(rowId);
    let payload: Record<string, unknown> | null = null;

    try {
      const originalRaw = rawMonthMap[rowId] ?? rawDetail ?? undefined;
      payload = convertDisplayRowToEnergyBalancePayload(updatedRow, originalRaw);
      const normalizedId = Number.isNaN(Number(rowId)) ? rowId : Number(rowId);

      let requestPayload: Record<string, unknown>;
      if (field === 'dataVencimentoBoleto') {
        const isoDate = (() => {
          if (!fieldInputValue) return null;
          try {
            const parsed = new Date(fieldInputValue);
            if (Number.isNaN(parsed.getTime())) return null;
            return parsed.toISOString().split('T')[0];
          } catch (error) {
            console.warn('[EnergyBalanceDetail] âš ï¸ NÃ£o foi possÃ­vel converter data de vencimento', {
              fieldInputValue,
              error,
            });
            return null;
          }
        })();


        requestPayload = {
          billsDate: isoDate,
          bills_date: isoDate,
        };
      } else {
        requestPayload = {
          id: payload.id ?? normalizedId,
          ...payload,
        };
      }


      const response = await energyBalanceRequest(`/energy-balance/${encodeURIComponent(String(normalizedId))}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(requestPayload),
      });

      if (response && typeof response === 'object' && !Array.isArray(response)) {
        const record = response as Record<string, unknown>;
        setRawDetail((prev) => ({ ...(prev ?? {}), ...record }));
        setRawMonthMap((prev) => ({ ...prev, [rowId]: record }));
      } else if (originalRaw && typeof originalRaw === 'object') {
        const fallbackRecord =
          field === 'dataVencimentoBoleto'
            ? {
                ...(originalRaw as Record<string, unknown>),
                billsDate: requestPayload.billsDate ?? null,
                bills_date: requestPayload.bills_date ?? null,
              }
            : (originalRaw as Record<string, unknown>);
        setRawDetail((prev) => ({ ...(prev ?? {}), ...fallbackRecord }));
        setRawMonthMap((prev) => ({ ...prev, [rowId]: fallbackRecord }));
      }

      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          months: prev.months.map((month) =>
            month.id === rowId ? mergeMonthWithEmailRow(month, updatedRow) : month,
          ),
        };
      });

      setEditableRows((prev) => ({
        ...prev,
        [rowId]: updatedRow,
      }));

      setDirtyRows((prev) => prev.filter((item) => item !== rowId));
      setEditingField(null);
      setFieldInputValue('');
      toast.success('Campo atualizado com sucesso!');
    } catch (saveError) {
      console.error('[EnergyBalanceDetail] Erro ao salvar campo', {
        field,
        rowId,
        payload,
        error: saveError,
      });
      toast.error('Não foi possível salvar o campo.');
    } finally {
      setSavingRowId(null);
    }
  }, [detail, fieldInputValue, rawDetail, rawMonthMap, editableRows, selectedMonthId]);

  const handleSaveProinfaTotal = React.useCallback(async () => {
    if (!detail || !selectedMonthId) return;

    const primaryMonth = detail.months.find(m => m.id === selectedMonthId) ?? detail.months[0];
    const rowId = primaryMonth.id;
    const originalRaw = rawMonthMap[rowId] ?? rawDetail ?? null;

    if (!originalRaw || typeof originalRaw !== 'object') return;

    setSavingRowId(rowId);
    try {
      // Converter o valor do PROINFA corretamente (preservar zero à esquerda)
      // Se o usuário digitou "0,3", converter para número 0.3 e depois para string "0.3"
      let proinfaValue: string | number = fieldInputValue;
      
      // Normalizar o valor: remover espaços e símbolos, substituir vírgula por ponto
      const normalized = fieldInputValue.trim().replace(/[R$\s]/g, '').replace(',', '.');
      
      console.log('[handleSaveProinfaTotal] ðŸ” Processando PROINFA:', {
        originalInput: fieldInputValue,
        normalized,
      });
      
      if (normalized && normalized !== '') {
        const numValue = parseFloat(normalized);
        if (!isNaN(numValue) && isFinite(numValue)) {
          // Determinar quantas casas decimais preservar
          const decimalPlaces = normalized.includes('.') ? (normalized.split('.')[1]?.length || 0) : 0;
          
          // Converter para string preservando casas decimais e zero à esquerda
          if (decimalPlaces > 0) {
            proinfaValue = numValue.toFixed(decimalPlaces);
          } else {
            proinfaValue = numValue.toString();
          }
          
          console.log('[handleSaveProinfaTotal] âœ… PROINFA convertido:', {
            numValue,
            decimalPlaces,
            finalValue: proinfaValue,
          });
        } else {
          proinfaValue = fieldInputValue; // Manter valor original se não for número válido
        }
      }

      // Atualizar o rawMonthMap com o novo valor de proinfaContribution
      const updatedRaw = {
        ...originalRaw,
        proinfaContribution: proinfaValue,
        proinfa_contribution: proinfaValue,
        proinfa: proinfaValue,
      };

      // Criar payload para enviar à API
      const payload: Record<string, unknown> = {
        ...(originalRaw as Record<string, unknown>),
        proinfaContribution: proinfaValue,
      };

      console.log('[handleSaveProinfaTotal] ðŸ” Salvando PROINFA:', {
        inputValue: fieldInputValue,
        normalized,
        finalValue: proinfaValue,
        payload,
      });

      const response = await energyBalanceRequest(`/energy-balance/${rowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(payload),
      });

      if (response && typeof response === 'object' && !Array.isArray(response)) {
        const record = response as Record<string, unknown>;
        setRawDetail((prev) => ({ ...(prev ?? {}), ...record }));
        setRawMonthMap((prev) => ({ ...prev, [rowId]: record }));
      } else {
        setRawMonthMap((prev) => ({ ...prev, [rowId]: updatedRaw as Record<string, unknown> }));
      }

      setEditingField(null);
      setFieldInputValue('');
      toast.success('PROINFA total atualizado com sucesso!');
    } catch (saveError) {
      console.error('[EnergyBalanceDetail] Erro ao salvar PROINFA total', saveError);
      toast.error('Não foi possível salvar o PROINFA total.');
    } finally {
      setSavingRowId(null);
    }
  }, [detail, fieldInputValue, rawDetail, rawMonthMap, selectedMonthId]);

  const handleKeyDownField = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, field: keyof EmailRow | 'proinfaTotal') => {
      if (e.key === 'Enter') {
        if (field === 'proinfaTotal') {
          void handleSaveProinfaTotal();
        } else {
          void handleSaveField(field as keyof EmailRow);
        }
      } else if (e.key === 'Escape') {
        handleCancelEditingField();
      }
    },
    [handleSaveField, handleSaveProinfaTotal, handleCancelEditingField],
  );

  // Buscar o contrato para obter informações de vencimento da NF e volumes
  // IMPORTANTE: Estes hooks devem estar ANTES dos returns condicionais
  // Inclui 'contracts' como dependência para recalcular quando os contratos forem carregados
  const contract = React.useMemo(() => {
    if (!detail?.header.contractId) {
      return null;
    }
    if (!contracts || contracts.length === 0) {
      return null;
    }
    
    const found = getContractById(detail.header.contractId);
    
    if (found) {
      console.log('[VOLUME DEBUG] âœ… Contrato encontrado:', found.codigo || found.id);
    } else {
      console.log('[VOLUME DEBUG] âŒ Contrato NÃƒO encontrado (ID:', detail.header.contractId, ')');
    }
    
    return found;
  }, [detail?.header.contractId, getContractById, contracts]);
  
  // Formatar o vencimento da NF do contrato
  const nfVencimentoDisplay = React.useMemo(() => {
    if (!contract?.nfVencimentoTipo || !contract?.nfVencimentoDias) return null;
    return contract.nfVencimentoTipo === 'dias_uteis'
      ? `${contract.nfVencimentoDias}º dia útil`
      : `${contract.nfVencimentoDias}º dia`;
  }, [contract]);
  
  // Obter o mês selecionado (ou o primeiro se nenhum estiver selecionado)
  // Movido para antes dos returns condicionais para poder ser usado nos hooks
  const selectedMonth = detail?.months
    ? (selectedMonthId
        ? detail.months.find(m => m.id === selectedMonthId) ?? detail.months[0] ?? null
        : detail.months[0] ?? null)
    : null;
  const primaryMonth = selectedMonth;
  const primaryMonthRaw = primaryMonth && detail
    ? rawMonthMap[primaryMonth.id] ?? rawDetail ?? null
    : rawDetail ?? null;
  const primaryMonthRow = primaryMonth && detail
    ? editableRows[primaryMonth.id] ?? createEditableRow(detail, primaryMonth, primaryMonthRaw)
    : null;
  
  // Extrair o mês do balanço no formato YYYY-MM para buscar no contrato
  // Usa detail.header.titleSuffix que contém o mês do balanço (ex: "dez. 2025")
  const balanceMonthYM = React.useMemo(() => {
    // Tenta múltiplas fontes para o mês
    const titleSuffix = detail?.header?.titleSuffix;
    const primaryMonthMes = primaryMonth?.mes;
    const primaryMonthRawMes = primaryMonthRaw && typeof primaryMonthRaw === 'object' 
      ? (primaryMonthRaw['mes'] || primaryMonthRaw['month'] || primaryMonthRaw['competencia'] || primaryMonthRaw['referenceBase'] || primaryMonthRaw['reference_base'])
      : null;
    
    // Prioridade: titleSuffix > primaryMonth.mes > primaryMonthRaw > firstMonth.mes
    let mesSource = titleSuffix || primaryMonthMes || (typeof primaryMonthRawMes === 'string' ? primaryMonthRawMes : null);
    
    // Fallback: tenta pegar do primeiro mês do array
    if (!mesSource && detail?.months && detail.months.length > 0) {
      mesSource = detail.months[0].mes || null;
    }
    
    if (!mesSource) {
      console.log('[VOLUME DEBUG] âŒ MÃªs nÃ£o identificado');
      return null;
    }
    
    const mes = String(mesSource).trim();
    
    // Tenta extrair YYYY-MM se já estiver nesse formato
    const isoMatch = mes.match(/(\d{4})-(\d{2})/);
    if (isoMatch) {
      const result = `${isoMatch[1]}-${isoMatch[2]}`;
      console.log('[VOLUME DEBUG] ✅ Mês parseado:', result);
      return result;
    }
    
    // Mapeamento completo de nomes de meses em português
    const monthNames: Record<string, string> = {
      'jan': '01', 'janeiro': '01',
      'fev': '02', 'fevereiro': '02',
      'mar': '03', 'março': '03', 'marco': '03',
      'abr': '04', 'abril': '04',
      'mai': '05', 'maio': '05',
      'jun': '06', 'junho': '06',
      'jul': '07', 'julho': '07',
      'ago': '08', 'agosto': '08',
      'set': '09', 'setembro': '09',
      'out': '10', 'outubro': '10',
      'nov': '11', 'novembro': '11',
      'dez': '12', 'dezembro': '12',
    };
    
    // Tenta parsear formato "jan. 2025", "janeiro 2025", "dez. 2025", "12/2025", etc.
    const mesLower = mes.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Formato: "dez. 2025", "dez 2025", "dezembro 2025", "jun de 2025"
    const ptBrMatch = mesLower.match(/^([a-z]+)\.?\s*(?:de\s*)?(\d{4})/);
    if (ptBrMatch) {
      const monthKey = ptBrMatch[1].substring(0, 3);
      const monthNum = monthNames[monthKey] || monthNames[ptBrMatch[1]];
      if (monthNum) {
        const result = `${ptBrMatch[2]}-${monthNum}`;
        console.log('[VOLUME DEBUG] ✅ Mês parseado:', result, '(de:', mesSource, ')');
        return result;
      }
    }
    
    // Formato: "12/2025" ou "12-2025"
    const numericMatch = mes.match(/(\d{1,2})[\/\-](\d{4})/);
    if (numericMatch) {
      const monthNum = numericMatch[1].padStart(2, '0');
      const result = `${numericMatch[2]}-${monthNum}`;
      console.log('[VOLUME DEBUG] ✅ Mês parseado:', result);
      return result;
    }
    
    // Formato: "2025/12" ou similar
    const reverseMatch = mes.match(/(\d{4})[\/\-](\d{1,2})/);
    if (reverseMatch) {
      const monthNum = reverseMatch[2].padStart(2, '0');
      const result = `${reverseMatch[1]}-${monthNum}`;
      console.log('[VOLUME DEBUG] ✅ Mês parseado:', result);
      return result;
    }
    
    console.log('[VOLUME DEBUG] âŒ Formato de mÃªs nÃ£o reconhecido:', mes);
    return null;
  }, [detail?.header?.titleSuffix, primaryMonth?.mes, primaryMonthRaw, detail?.months]);
  
  // Tipo para o resultado da busca de volume
  type VolumeSearchResult = {
    value: number | null;
    status: 'found' | 'contract_not_found' | 'month_not_configured' | 'no_price_periods' | 'loading';
    message: string;
    contractCode?: string; // Número do contrato quando encontrado
  };

  // Extrair volume sazonal do contrato para o mês do balanço
  const volumeSeasonalResult = React.useMemo((): VolumeSearchResult => {
    // Ainda carregando contratos
    if (contractsLoading) {
      return { value: null, status: 'loading', message: 'Carregando...' };
    }
    
    // Contrato não encontrado no sistema
    if (!contract) {
      return { value: null, status: 'contract_not_found', message: 'Contrato não encontrado' };
    }
    
    const contractCode = contract.codigo || contract.id || 'N/A';
    
    // Mês do balanço não identificado
    if (!balanceMonthYM) {
      console.log('[VOLUME DEBUG] ??? Mês não identificado. Fontes:', {
        titleSuffix: detail?.header?.titleSuffix,
        primaryMonthMes: primaryMonth?.mes,
        primaryMonthExists: !!primaryMonth,
        detailMonthsLength: detail?.months?.length ?? 0
      });
      return { 
        value: null, 
        status: 'month_not_configured', 
        message: 'Mês não identificado',
        contractCode 
      };
    }
    
    console.log('[VOLUME DEBUG] OK. Mes identificado:', balanceMonthYM);
    
    const normalizeMonth = (ym: string | null | undefined): string | null => {
      if (!ym) return null;
      const trimmed = String(ym).trim();
      const isoMatch = trimmed.match(/(\d{4})-(\d{1,2})/);
      if (isoMatch) {
        const year = isoMatch[1];
        const month = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
        return `${year}-${month}`;
      }
      if (/^\d{4}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      return trimmed;
    };
    
    // Parse seguro para valores que podem estar duplamente serializados
    const deepParseJson = (value: unknown): unknown => {
      let current = value;
      let attempts = 0;
      while (typeof current === 'string' && attempts < 3) {
        try {
          current = JSON.parse(current);
        } catch {
          break;
        }
        attempts += 1;
      }
      return current;
    };
    
    const pricePeriodsSources: Array<{ source: string; value: unknown }> = [
      { source: 'contract.pricePeriods', value: (contract as { pricePeriods?: unknown }).pricePeriods },
      { source: 'contract.periodPrice.price_periods', value: contract.periodPrice?.price_periods },
      { source: 'contract.price_periods', value: (contract as { price_periods?: unknown }).price_periods },
      { source: 'contract.period_price.price_periods', value: (contract as { period_price?: { price_periods?: unknown } }).period_price?.price_periods },
    ];
    
    let parsedPricePeriods: ReturnType<typeof parseContractPricePeriods> | null = null;
    for (const candidate of pricePeriodsSources) {
      if (candidate.value === null || candidate.value === undefined) continue;
      
      const parsedCandidate = deepParseJson(candidate.value);
      const nestedParsed = parsedCandidate && typeof parsedCandidate === 'object' && !Array.isArray(parsedCandidate)
        ? deepParseJson((parsedCandidate as { price_periods?: unknown }).price_periods)
        : null;
      
      const parsedFromCandidate = parseContractPricePeriods(parsedCandidate);
      const parsedFromNested = parseContractPricePeriods(nestedParsed ?? undefined);
      parsedPricePeriods = parsedFromCandidate || parsedFromNested;
      
      console.log('[VOLUME DEBUG] OK Fonte de price_periods analisada:', {
        source: candidate.source,
        rawType: typeof candidate.value,
        parsedType: parsedCandidate && typeof parsedCandidate,
        hasNestedPricePeriods: Boolean(nestedParsed),
        hasPeriods: Boolean(parsedPricePeriods?.periods?.length),
        sampleMonth: parsedPricePeriods?.periods?.[0]?.months?.[0],
      });
      
      if (parsedPricePeriods?.periods?.length) {
        break;
      }
    }
    
    if (!parsedPricePeriods || !parsedPricePeriods.periods?.length) {
      console.log('[VOLUME DEBUG] ??? Contrato sem price_periods utilizáveis', {
        contractCode,
        sourcesChecked: pricePeriodsSources.map((s) => s.source),
      });
      return { 
        value: null, 
        status: 'no_price_periods', 
        message: 'Volumes não configurados no contrato',
        contractCode 
      };
    }
    
    const allMonthsInJson: string[] = [];
    parsedPricePeriods.periods.forEach((period) => {
      period.months?.forEach((month) => {
        const normalized = normalizeMonth((month as { ym?: string; month?: string }).ym ?? (month as { month?: string }).month);
        if (normalized && !allMonthsInJson.includes(normalized)) {
          allMonthsInJson.push(normalized);
        }
      });
    });
    
    const normalizedBalanceMonth = normalizeMonth(balanceMonthYM);
    
    if (!normalizedBalanceMonth) {
      return { 
        value: null, 
        status: 'month_not_configured', 
        message: 'Formato de mês inválido',
        contractCode 
      };
    }
    
    console.log('[VOLUME DEBUG] OK Buscando mes:', normalizedBalanceMonth, '| Meses disponiveis:', allMonthsInJson.sort().join(', '));
    
    let foundMonth: { ym?: string; month?: string; volumeSeasonalizedMWh?: number | string; volumeMWh?: number | string; volume?: number | string } | null = null;
    for (const period of parsedPricePeriods.periods) {
      foundMonth = period.months?.find((m) => {
        const normalized = normalizeMonth((m as { ym?: string; month?: string }).ym ?? (m as { month?: string }).month);
        return normalized === normalizedBalanceMonth;
      }) ?? null;
      
      if (foundMonth) break;
    }
    
    if (foundMonth) {
      const volumeCandidates = [
        foundMonth.volumeSeasonalizedMWh,
        (foundMonth as { volumeMWh?: number | string }).volumeMWh,
        (foundMonth as { volume?: number | string }).volume,
      ];
      
      const parsedVolume = volumeCandidates.reduce<number | null>((acc, candidate) => {
        if (acc !== null) return acc;
        if (candidate === null || candidate === undefined) return acc;
        if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
        if (typeof candidate === 'string') {
          const numeric = Number.parseFloat(candidate.replace(/\./g, '').replace(',', '.'));
          return Number.isFinite(numeric) ? numeric : acc;
        }
        return acc;
      }, null);
      
      console.log('[VOLUME DEBUG] OK Mes encontrado no contrato:', {
        month: foundMonth,
        parsedVolume,
      });
      
      if (parsedVolume !== null) {
        return { 
          value: parsedVolume, 
          status: 'found', 
          message: 'Vol. Sazonal do contrato',
          contractCode 
        };
      }
      
      console.log('[VOLUME DEBUG] ??? Mes encontrado mas sem volume sazonal configurado');
      return { 
        value: null, 
        status: 'month_not_configured', 
        message: `Mês ${normalizedBalanceMonth} não possui volume sazonal`, 
        contractCode 
      };
    }
    
    const sortedMonthsForRange = [...allMonthsInJson].sort();
    const firstMonth = sortedMonthsForRange[0] || 'N/A';
    const lastMonth = sortedMonthsForRange[sortedMonthsForRange.length - 1] || 'N/A';
    
    console.log('[VOLUME DEBUG] ??? Mês', normalizedBalanceMonth, 'não encontrado no contrato', contractCode, '(cobre:', firstMonth, 'até', lastMonth, ')');
    
    return { 
      value: null, 
      status: 'month_not_configured', 
      message: `Mês ${normalizedBalanceMonth} não configurado (contrato: ${firstMonth} a ${lastMonth})`,
      contractCode 
    };
  }, [contract, balanceMonthYM, contractsLoading, detail?.header?.contractId]);
  
  // Mantém compatibilidade com o código existente
  const volumeSeasonalFromContract = volumeSeasonalResult.value;

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

  const measurementStatusRaw = (detail.statusMeasurement ?? '').trim();
  const measurementStatusNormalized = measurementStatusRaw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const measurementStatus = measurementStatusRaw || 'Não informado';
  const isMeasurementComplete = measurementStatusNormalized === 'completo';
  const measurementCardClasses = isMeasurementComplete
    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-900/10'
    : 'border-red-200 bg-red-50 dark:border-red-500/40 dark:bg-red-900/10';
  const measurementValueClasses = isMeasurementComplete
    ? 'text-emerald-700 dark:text-emerald-200'
    : 'text-red-700 dark:text-red-200';

  const proinfaCardClasses = hasMissingProinfa
    ? 'border border-red-200 bg-red-50 ring-2 ring-red-200 dark:border-red-500/40 dark:bg-red-900/10 dark:ring-red-500/60'
    : 'border border-gray-100 bg-white';

  const proinfaValueClasses = hasMissingProinfa
    ? 'text-red-700 dark:text-red-200'
    : 'text-gray-900 dark:text-white';

  const reajustedPriceDisplayValue = primaryMonth
    ? deriveReajustedDisplayValue(primaryMonth, primaryMonthRaw)
    : 'Não informado';


  // Extrair consumo total diretamente do rawMonthMap (consumptionKwh do banco - SEM conversões)
  const getConsumptionKwhFromRaw = (raw: Record<string, unknown> | null | undefined): string => {
    if (!raw || typeof raw !== 'object') return '';
    return String(raw['consumptionKwh'] ?? raw['consumption_kwh'] ?? raw['consumo_kwh'] ?? '');
  };
  const consumoTotalBruto = primaryMonthRaw && typeof primaryMonthRaw === 'object'
    ? getConsumptionKwhFromRaw(primaryMonthRaw) || getConsumptionKwhFromRaw(rawDetail)
    : getConsumptionKwhFromRaw(rawDetail);
  // Extrair sentOk e formatar para exibição
  const getSentOkFromRaw = (raw: Record<string, unknown> | null | undefined): boolean | null => {
    if (!raw || typeof raw !== 'object') return null;
    const sentOkValue = raw['sentOk'] ?? raw['sent_ok'] ?? raw['envioOk'] ?? null;
    if (sentOkValue === true || sentOkValue === 'true' || sentOkValue === 'True') return true;
    if (sentOkValue === false || sentOkValue === 'false' || sentOkValue === 'False') return false;
    return null;
  };
  const sentOkValue = primaryMonthRaw && typeof primaryMonthRaw === 'object'
    ? getSentOkFromRaw(primaryMonthRaw) ?? getSentOkFromRaw(rawDetail)
    : getSentOkFromRaw(rawDetail);
  
  // Formatação para exibição: true = "Email liberado" (verde), false/vazio = "Email não liberado" (vermelho)
  const envioOkDisplay = sentOkValue === true
    ? { text: 'Email liberado', color: 'text-green-700' }
    : { text: 'Email não liberado', color: 'text-red-700' };

  // Extrair PROINFA total diretamente do rawMonthMap (proinfaContribution do banco - SEM conversões)
  const getProinfaTotalFromRaw = (raw: Record<string, unknown> | null | undefined): string => {
    if (!raw || typeof raw !== 'object') return '';
    return String(raw['proinfaContribution'] ?? raw['proinfa_contribution'] ?? raw['proinfa'] ?? raw['proinfaTotal'] ?? '');
  };
  const proinfaTotalBruto = primaryMonthRaw && typeof primaryMonthRaw === 'object'
    ? getProinfaTotalFromRaw(primaryMonthRaw) || getProinfaTotalFromRaw(rawDetail)
    : getProinfaTotalFromRaw(rawDetail);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-screen-2xl space-y-6 p-6">
      <header className="rounded-xl border-2 border-yn-orange bg-gradient-to-r from-white to-gray-50 p-6 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <h1 className="text-3xl font-bold text-gray-900">
                Balanço Energético
              </h1>
              <span className="rounded-full bg-yn-orange px-3 py-1 text-xs font-bold text-white shadow-sm">
                {detail.header.titleSuffix || '-'}
              </span>
            </div>
            <div className="bg-white rounded-lg border-2 border-yn-orange/30 px-4 py-3 shadow-sm">
              <div className="flex flex-col gap-1">
                <div className="text-xl font-bold text-gray-900">
                  {detail.header.razao || 'Cliente não informado'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-600">CNPJ:</span>
                  <span className="text-base font-bold text-yn-orange">
                    {detail.header.cnpj || 'Não informado'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {contractLink ? (
              <Link
                to={contractLink}
                className="inline-flex items-center justify-center rounded-lg border-2 border-yn-orange bg-white px-5 py-2.5 text-sm font-bold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white hover:shadow-md"
              >
                Ver Contrato
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-400 opacity-50">
                Ver Contrato
              </span>
            )}
            <Link
              to="/balancos"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-gray-400 hover:shadow-md"
            >
              â† Voltar
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-md transition hover:shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600">Consumo total (MWh)</div>
          <div className="mt-3 text-3xl font-bold text-gray-900">{consumoTotalBruto || 'Não informado'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-md transition hover:shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600">Medição</div>
          <div className={`mt-3 text-xl font-bold ${detail.statusMeasurement === 'Completo' ? 'text-green-700' : 'text-amber-700'}`}>
            {detail.statusMeasurement || 'Não informado'}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-md transition hover:shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600">Data Disparo</div>
          <div className="mt-3 text-xl font-bold text-gray-900">
            {primaryMonthRow?.disparo ? formatDateTime(String(primaryMonthRow.disparo)) : 'Não disparado'}
          </div>
        </div>
      </div>

      {/* Seletor de Meses */}
      {detail.months.length > 1 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md">
          <div className="mb-3 text-sm font-semibold text-gray-700">Selecione o mês:</div>
          <div className="flex flex-wrap gap-2">
            {detail.months.map((month) => {
              const isSelected = selectedMonthId === month.id;
              return (
                <button
                  key={month.id}
                  type="button"
                  onClick={() => setSelectedMonthId(month.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    isSelected
                      ? 'bg-yn-orange text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {month.mes}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {primaryMonthRow && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">
              Dados do Balanço {primaryMonth ? `- ${primaryMonth.mes}` : ''}
            </h2>
            <span className="rounded-full bg-yn-orange/10 px-3 py-1 text-xs font-semibold text-yn-orange">Editável</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Preço reajustado (R$) */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                Preço reajustado (R$)
              </div>
              <div className="mt-3 text-xl font-bold text-gray-900">
                {reajustedPriceDisplayValue && reajustedPriceDisplayValue.trim() !== '' ? reajustedPriceDisplayValue : '-'}
              </div>
            </div>

            {/* Preço */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>Preço (R$/MWh)</span>
                {editingField !== 'preco' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('preco', prepareEditableValue('preco', primaryMonthRow.preco))}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'preco' ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={fieldInputRef}
                    type="text"
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'preco')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                    placeholder="0,00"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('preco')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-xl font-bold text-gray-900">{primaryMonthRow.preco || '-'}</div>
              )}
            </div>

            {/* Fornecedor */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>Fornecedor</span>
                {editingField !== 'fornecedor' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('fornecedor', primaryMonthRow.fornecedor || '')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'fornecedor' ? (
                <div className="mt-2 flex items-center gap-1">
                  <select
                    ref={fieldInputRef as React.RefObject<HTMLSelectElement>}
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'fornecedor')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                  >
                    {supplierSelectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleSaveField('fornecedor')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-xl font-bold text-gray-900">{primaryMonthRow.fornecedor || '-'}</div>
              )}
            </div>

            {/* Medidor */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>Medidor</span>
                {editingField !== 'medidor' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('medidor', primaryMonthRow.medidor || '')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'medidor' ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={fieldInputRef}
                    type="text"
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'medidor')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('medidor')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-xl font-bold text-gray-900">{primaryMonthRow.medidor || '-'}</div>
              )}
            </div>

            {/* Consumo - Card maior */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg sm:col-span-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>Consumo (MWh)</span>
                {editingField !== 'consumo' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('consumo', prepareEditableValue('consumo', primaryMonthRow.consumo))}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'consumo' ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={fieldInputRef}
                    type="text"
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'consumo')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('consumo')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-xl font-bold text-gray-900">{primaryMonthRow.consumo || '-'}</div>
              )}
            </div>

            {/* Perdas */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>Perdas (3%)</span>
                {editingField !== 'perdas3' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('perdas3', prepareEditableValue('perdas3', primaryMonthRow.perdas3))}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'perdas3' ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={fieldInputRef}
                    type="text"
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'perdas3')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('perdas3')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-xl font-bold text-gray-900">{primaryMonthRow.perdas3 || '-'}</div>
              )}
            </div>

            {/* Requisito */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>Requisito</span>
                {editingField !== 'requisito' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('requisito', primaryMonthRow.requisito || '')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'requisito' ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={fieldInputRef}
                    type="text"
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'requisito')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('requisito')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-xl font-bold text-gray-900">{primaryMonthRow.requisito || '-'}</div>
              )}
            </div>

            {/* NET */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>NET</span>
                {editingField !== 'net' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('net', prepareEditableValue('net', primaryMonthRow.net))}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'net' ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={fieldInputRef}
                    type="text"
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'net')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('net')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-xl font-bold text-gray-900">{primaryMonthRow.net || '-'}</div>
              )}
            </div>

            {/* Medição */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>Medição</span>
                {editingField !== 'medicao' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('medicao', primaryMonthRow.medicao || '')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'medicao' ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={fieldInputRef}
                    type="text"
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'medicao')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('medicao')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-xl font-bold text-gray-900">{primaryMonthRow.medicao || '-'}</div>
              )}
            </div>

            {/* Proinfa - Campo obrigatório */}
            <div className={`rounded-xl border p-4 shadow-md transition hover:shadow-lg ${isProinfaValueMissing(prepareEditableValue('proinfa', primaryMonthRow.proinfa)) ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>Proinfa (MWh) *</span>
                {editingField !== 'proinfa' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('proinfa', prepareEditableValue('proinfa', primaryMonthRow.proinfa))}
                    disabled={savingRowId === primaryMonth?.id}
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition disabled:opacity-50 ${isProinfaValueMissing(prepareEditableValue('proinfa', primaryMonthRow.proinfa)) ? 'border-red-300 bg-white text-red-600 hover:border-red-400' : 'border-gray-200 bg-gray-100 text-gray-600 hover:border-gray-300'}`}
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'proinfa' ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={fieldInputRef}
                    type="text"
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'proinfa')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                    placeholder="0.000"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('proinfa')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div className={`mt-2 text-lg font-bold ${isProinfaValueMissing(prepareEditableValue('proinfa', primaryMonthRow.proinfa)) ? 'text-red-700' : 'text-gray-900'}`}>
                  {primaryMonthRow.proinfa || '-'}
                </div>
              )}
            </div>

            {/* Volume contratado */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>Volume contratado (MWh)</span>
                {detail.header.contractId && (
                  <button
                    type="button"
                    onClick={() => setIsVolumeModalOpen(true)}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {/* Número do contrato quando encontrado */}
              {volumeSeasonalResult.contractCode && (
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Contrato: {volumeSeasonalResult.contractCode}
                </div>
              )}
              {/* Indicador do mês vigente */}
              {(detail.header.titleSuffix || balanceMonthYM || primaryMonth?.mes) && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {detail.header.titleSuffix || (balanceMonthYM ? (() => {
                    const [year, month] = balanceMonthYM.split('-').map(Number);
                    const date = new Date(year, month - 1, 1);
                    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  })() : primaryMonth?.mes)}
                </div>
              )}
              <div className={`mt-2 text-xl font-bold ${
                volumeSeasonalResult.status === 'found' 
                  ? 'text-gray-900' 
                  : volumeSeasonalResult.status === 'loading'
                  ? 'text-gray-400'
                  : 'text-amber-600'
              }`}>
                {volumeSeasonalResult.status === 'found'
                  ? volumeSeasonalResult.value!.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : volumeSeasonalResult.status === 'loading'
                  ? 'Carregando...'
                  : volumeSeasonalResult.status === 'contract_not_found'
                  ? 'Contrato não encontrado'
                  : volumeSeasonalResult.status === 'month_not_configured'
                  ? 'Mês não configurado'
                  : 'Volumes não configurados'}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {volumeSeasonalResult.message}
              </div>
            </div>

            {/* Mínimo */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>Mínimo (MWh)</span>
                {editingField !== 'minimo' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('minimo', prepareEditableValue('minimo', primaryMonthRow.minimo))}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'minimo' ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={fieldInputRef}
                    type="text"
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'minimo')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('minimo')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-xl font-bold text-gray-900">{primaryMonthRow.minimo || '-'}</div>
              )}
            </div>

            {/* Máximo */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>Máximo (MWh)</span>
                {editingField !== 'maximo' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('maximo', prepareEditableValue('maximo', primaryMonthRow.maximo))}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'maximo' ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={fieldInputRef}
                    type="text"
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'maximo')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('maximo')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-xl font-bold text-gray-900">{primaryMonthRow.maximo || '-'}</div>
              )}
            </div>

            {/* Faturar - Card maior */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg sm:col-span-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>Faturar</span>
                {editingField !== 'faturar' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('faturar', prepareEditableValue('faturar', primaryMonthRow.faturar))}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'faturar' ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={fieldInputRef}
                    type="text"
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'faturar')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('faturar')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-xl font-bold text-gray-900">{primaryMonthRow.faturar || '-'}</div>
              )}
            </div>

            {/* CP */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>CP</span>
                {editingField !== 'cp' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('cp', primaryMonthRow.cp || '')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'cp' ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={fieldInputRef}
                    type="text"
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'cp')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('cp')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-xl font-bold text-gray-900">{primaryMonthRow.cp || '-'}</div>
              )}
            </div>

            {/* Email */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg sm:col-span-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>Email</span>
                {editingField !== 'email' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('email', primaryMonthRow.email || '')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'email' ? (
                <div className="mt-2 flex items-center gap-1">
                  <input
                    ref={fieldInputRef}
                    type="email"
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'email')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('email')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <EmailDisplay emails={primaryMonthRow.email || '-'} />
              )}
            </div>

            {/* Envio OK */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>Envio OK</span>
                {editingField !== 'envioOk' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('envioOk', primaryMonthRow.envioOk || '')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'envioOk' ? (
                <div className="mt-2 flex items-center gap-1">
                  <select
                    ref={fieldInputRef as React.RefObject<HTMLSelectElement>}
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'envioOk')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                  >
                    {booleanSelectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleSaveField('envioOk')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div className={`mt-3 text-xl font-bold ${envioOkDisplay.color}`}>{envioOkDisplay.text}</div>
              )}
            </div>

            {/* Data Vencimento */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition hover:shadow-lg">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-600">
                <span>Data Vencimento</span>
                {editingField !== 'dataVencimentoBoleto' && (
                  <button
                    type="button"
                    onClick={() => handleStartEditingField('dataVencimentoBoleto', primaryMonthRow.dataVencimentoBoleto || '')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50"
                  >
                    Editar
                  </button>
                )}
              </div>
              {editingField === 'dataVencimentoBoleto' ? (
                <div className="mt-2 flex items-center gap-1">
                  <input
                    ref={fieldInputRef}
                    type="datetime-local"
                    value={fieldInputValue}
                    onChange={(e) => setFieldInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDownField(e, 'dataVencimentoBoleto')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-base font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveField('dataVencimentoBoleto')}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
                  >
                    {savingRowId === primaryMonth?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'âœ“'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditingField}
                    disabled={savingRowId === primaryMonth?.id}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    âœ•
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-xl font-bold text-gray-900">{formatDate(primaryMonthRow.dataVencimentoBoleto || '') || '-'}</div>
              )}
              {nfVencimentoDisplay && (
                <div className="mt-2 text-xs text-gray-500">
                  <span className="font-medium">Vencimento configurado no contrato:</span>{' '}
                  <span className="text-yn-orange font-semibold">{nfVencimentoDisplay}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabela Completa - Comentada por enquanto */}
      {/* <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Tabela Completa</h3>
          <p className="text-sm text-gray-600 mt-1">Visualize e edite todos os campos do balanço</p>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full table-auto text-xs">
            <thead className="bg-gradient-to-r from-yn-orange to-orange-600 text-white text-xs font-semibold uppercase tracking-wider">
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
                  const rawMonth = rawMonthMap[month.id] ?? rawDetail ?? null;
                  const baseRow = editableRows[month.id] ?? createEditableRow(detail, month, rawMonth);
                  const isRowDirty = dirtyRows.includes(month.id);

                  return (
                    <tr key={month.id} className="bg-white hover:bg-gray-50">
                      {monthColumns.map((column) => {
                        const rawValue = baseRow[column.key] ?? '';
                        const displayValue = rawValue || '';
                        const isProinfaColumn = column.key === 'proinfa';
                        const isRequiredMissing =
                          column.required &&
                          (isProinfaColumn
                            ? isProinfaValueMissing(displayValue)
                            : displayValue.trim() === '');

                        if (!column.editable) {
                          let text = displayValue;
                          if (column.key === 'dataBase') {
                            text = month.mes || '-';
                          }
                          if (column.key === 'disparo') {
                            const disparoValue = displayValue || month.disparo || '';
                            text = disparoValue ? formatDateTime(String(disparoValue)) : 'Não disparado';
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

                        const baseClasses = isRequiredMissing
                          ? 'border-red-400 bg-red-50 text-red-700 placeholder:text-red-400 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-200 text-gray-900 focus:border-yn-orange focus:ring-yn-orange/40';
                        const highlightClasses =
                          isProinfaColumn && isRequiredMissing
                            ? ' animate-pulse ring-2 ring-red-300 dark:ring-red-500/60'
                            : '';
                        const commonClasses = `w-full rounded-md border px-2 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 ${baseClasses}${highlightClasses}`;

                        let selectOptionsToRender: SelectOption[] | undefined;
                        if (column.inputType === 'select') {
                          const availableOptions = column.selectOptions ?? booleanSelectOptions;
                          const trimmedValue = displayValue.trim();
                          selectOptionsToRender =
                            trimmedValue && !availableOptions.some((option) => option.value === displayValue)
                              ? [...availableOptions, { label: trimmedValue, value: displayValue }]
                              : availableOptions;
                        }

                        return (
                          <td key={column.key} className={`px-2 py-3 align-top ${column.minWidth ?? ''}`}>
                            {column.inputType === 'select' ? (
                              <select
                                value={displayValue}
                                onChange={(event) =>
                                  handleFieldChange(month.id, column.key, event.target.value, baseRow)
                                }
                                className={`${commonClasses} bg-white`}>
                                {(selectOptionsToRender ?? booleanSelectOptions).map((option) => (
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
                                placeholder={
                                  column.required
                                    ? isProinfaColumn
                                      ? 'Informe o PROINFA'
                                      : 'Obrigatorio'
                                    : undefined
                                }
                                className={commonClasses}
                                ref={(element) => {
                                  if (isProinfaColumn) {
                                    if (element) {
                                      proinfaInputRefs.current[month.id] = element;
                                    } else {
                                      delete proinfaInputRefs.current[month.id];
                                    }
                                  }
                                }}
                              />
                            )}
                            {column.required && isRequiredMissing ? (
                              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-red-600">
                                Preencha o PROINFA deste mes.
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
      </div> */}

      {primaryMonth ? (
        <EmailDispatchApprovalCard
          balanceId={id ?? null}
          row={primaryMonthRow}
          rawData={primaryMonthRaw ?? null}
          onSuccess={handleEmailDispatchSuccess}
        />
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-md space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-bold text-gray-900">Balanço Energético</h3>
          <p className="mt-2 text-sm text-gray-600">
            Linha do tempo mensal por medidor/cliente/contrato consolidando consumo, preço e encargos para cálculo,
            auditoria e geração de oportunidades.
          </p>
        </div>

        {/* Seção de Histórico/Eventos removida - endpoint /events não existe na API */}
        {/*
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900">Linha do tempo</h4>
          </div>
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm font-bold text-gray-500">
            Histórico não disponível
          </div>
        </div>
        */}
      </section>
      </div>
      
      {/* Modal de Volume Contratado */}
      {detail.header.contractId && (
        <VolumeContratadoModal
          open={isVolumeModalOpen}
          contractId={detail.header.contractId}
          balanceMonth={balanceMonthYM || undefined}
          onClose={() => setIsVolumeModalOpen(false)}
          onSave={async (updatedVolumes) => {
            // Atualiza o campo contrato no balanço para o mês atual
            if (balanceMonthYM && updatedVolumes[balanceMonthYM] !== undefined && primaryMonth) {
              const newVolumeValue = updatedVolumes[balanceMonthYM].toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              
              // Atualiza o estado local do balanço
              setEditableRows((prev) => ({
                ...prev,
                [primaryMonth.id]: {
                  ...(prev[primaryMonth.id] ?? createEditableRow(detail, primaryMonth, primaryMonthRaw)),
                  contrato: newVolumeValue,
                },
              }));
              
              // Salva no backend do balanço
              try {
                const normalizedId = Number.isNaN(Number(primaryMonth.id)) ? primaryMonth.id : Number(primaryMonth.id);
                await energyBalanceRequest(`/energy-balance/${encodeURIComponent(String(normalizedId))}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                  },
                  body: JSON.stringify({
                    contract: newVolumeValue,
                    contrato: newVolumeValue,
                  }),
                });
              } catch (error) {
                console.warn('[EnergyBalanceDetail] âš ï¸ Erro ao atualizar volume no balanÃ§o:', error);
              }
            }
          }}
        />
      )}
      
    </div>
  );
}


