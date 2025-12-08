import React from 'react';
import { X, Plus, Trash2, PencilLine } from 'lucide-react';
import type {
  ContractDetails as ContractMock,
  ContractInvoiceStatus,
  StatusResumo,
} from '../../types/contracts';
import { formatMesLabel, obrigacaoColunas } from '../../types/contracts';
import PricePeriodsModal, { PricePeriods, summarizePricePeriods } from './PricePeriodsModal';
import { formatCurrencyBRL, formatCurrencyInputBlur, parseCurrencyInput, sanitizeCurrencyInput } from '../../utils/currency';
import { monthsBetween } from '../../utils/dateRange';
import { SUPPLIER_NAMES, getSupplierEmails } from '../../utils/suppliers';

const energySourceOptions = ['Incentivada 0%', 'Incentivada 50%', 'Incentivada 100%', 'Convencional'] as const;
type EnergySourceOption = (typeof energySourceOptions)[number];

const submarketOptions = ['Norte', 'Nordeste', 'Sudeste/Centro-Oeste', 'Sul'] as const;
type SubmarketOption = (typeof submarketOptions)[number] | '';

const volumeUnitOptions = [
  { value: 'MWH', label: 'MWh' },
  { value: 'MW_MEDIO', label: 'MW médio' },
] as const;

type VolumeUnit = (typeof volumeUnitOptions)[number]['value'];

type FormErrors = Partial<
  Record<
    | 'client'
    | 'cnpj'
    | 'startDate'
    | 'endDate'
    | 'upperLimit'
    | 'lowerLimit'
    | 'seasonalFlexUpper'
    | 'seasonalFlexLower'
    | 'emailBalanco'
    | 'emailFaturamento'
    | 'nfVencimentoTipo'
    | 'nfVencimentoDias'
  ,
    string
  >
>;

type FormState = {
  client: string;
  razaoSocial: string;
  cnpj: string;
  segment: string;
  contact: string;
  emailBalanco: string;
  emailFaturamento: string;
  volume: string;
  volumeUnit: VolumeUnit;
  energySource: EnergySourceOption;
  modality: string;
  supplier: string;
  startDate: string;
  endDate: string;
  upperLimit: string;
  lowerLimit: string;
  seasonalFlexUpper: string;
  seasonalFlexLower: string;
  submarket: SubmarketOption;
  // Medidor maps to groupName in API
  medidor: string;
  // Flat price (applies to all years) and number of years
  flatPrice: string;
  flatYears: number;
  // Price periods (per-month/periods) — optional detailed pricing
  pricePeriods: PricePeriods;
  status: ContractMock['status'];
  // Vencimento da NF
  nfVencimentoTipo: 'dias_uteis' | 'dias_corridos' | '';
  nfVencimentoDias: string;
};

const HOURS_IN_MONTH = 730;
const dayOptions = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0'));
const competenceFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const volumeFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ensureRandomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const sanitizeCnpj = (value: string) => value.replace(/\D/g, '').slice(0, 14);

const formatCnpj = (value: string) => {
  const digits = sanitizeCnpj(value);
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 5);
  const part3 = digits.slice(5, 8);
  const part4 = digits.slice(8, 12);
  const part5 = digits.slice(12, 14);
  const segments = [
    part1,
    part2 ? `.${part2}` : '',
    part3 ? `.${part3}` : '',
    part4 ? `/${part4}` : '',
    part5 ? `-${part5}` : '',
  ];
  return segments.join('');
};

const isValidCnpj = (value: string) => {
  const digits = sanitizeCnpj(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calculateDigit = (slice: number) => {
    let sum = 0;
    let pos = slice - 7;
    for (let i = 0; i < slice; i += 1) {
      sum += Number(digits.charAt(i)) * pos;
      pos -= 1;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11;
    return result < 2 ? 0 : 11 - result;
  };

  const digit1 = calculateDigit(12);
  const digit2 = calculateDigit(13);
  return digit1 === Number(digits.charAt(12)) && digit2 === Number(digits.charAt(13));
};

const buildAnalises = (): ContractMock['analises'] => [
  {
    area: 'Dados Cadastrais',
    etapas: [
      { nome: 'Dados', status: 'amarelo' },
      { nome: 'Cálculo', status: 'amarelo' },
      { nome: 'Análise', status: 'amarelo' },
    ],
  },
  {
    area: 'Faturamento',
    etapas: [
      { nome: 'Dados', status: 'amarelo' },
      { nome: 'Cálculo', status: 'amarelo' },
      { nome: 'Análise', status: 'amarelo' },
    ],
  },
  {
    area: 'Riscos & Projeções',
    etapas: [
      { nome: 'Dados', status: 'amarelo' },
      { nome: 'Cálculo', status: 'amarelo' },
      { nome: 'Análise', status: 'amarelo' },
    ],
  },
  {
    area: 'Conformidade',
    etapas: [
      { nome: 'Dados', status: 'amarelo' },
      { nome: 'Cálculo', status: 'amarelo' },
      { nome: 'Análise', status: 'amarelo' },
    ],
  },
];

const buildInitialFormState = (): FormState => ({
  client: '',
  razaoSocial: '',
  cnpj: '',
  segment: '',
  contact: '',
  emailBalanco: '',
  emailFaturamento: '',
  volume: '',
  volumeUnit: 'MWH',
  energySource: 'Incentivada 0%',
  modality: '',
  supplier: '',
  startDate: '',
  endDate: '',
  upperLimit: '100',
  lowerLimit: '0',
  seasonalFlexUpper: '',
  seasonalFlexLower: '',
  submarket: '',
  medidor: '',
  flatPrice: '',
  flatYears: 1,
  pricePeriods: { periods: [] },
  status: 'Ativo',
  nfVencimentoTipo: '',
  nfVencimentoDias: '',
});

const generateFallbackMonths = (total = 6): string[] => {
  const result: string[] = [];
  const reference = new Date();
  reference.setDate(1);
  for (let i = total - 1; i >= 0; i -= 1) {
    const current = new Date(reference);
    current.setMonth(reference.getMonth() - i);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    result.push(`${year}-${month}`);
  }
  return result;
};

const deriveReferenceMonths = (formState: FormState): string[] => {
  const startMonth = formState.startDate ? formState.startDate.slice(0, 7) : null;
  const endMonth = formState.endDate ? formState.endDate.slice(0, 7) : null;
  if (startMonth && endMonth) {
    const months = monthsBetween(startMonth, endMonth);
    if (months.length) return months;
  }
  return generateFallbackMonths();
};

// Gera ID sequencial baseado no timestamp para garantir unicidade
// O backend pode sobrescrever com seu próprio ID sequencial
const ensureId = (value?: string) => {
  if (value && value.trim().length) return value.trim();
  // Gera um ID numérico baseado no timestamp (últimos 10 dígitos)
  const timestamp = Date.now();
  return String(timestamp).slice(-10);
};

type CreateContractModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (contract: ContractMock) => Promise<ContractMock>;
};

export default function CreateContractModal({ open, onClose, onCreate }: CreateContractModalProps) {
  const [formState, setFormState] = React.useState<FormState>(() => buildInitialFormState());
  const [errors, setErrors] = React.useState<FormErrors>({});
  // manual invoices removed
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setFormState(buildInitialFormState());
      setErrors({});
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  // using flatPrice instead of price periods
  const priceSummary = React.useMemo(() => summarizePricePeriods(formState.pricePeriods), [formState.pricePeriods]);

  const handleInputChange = (
    field: keyof Pick<
      FormState,
      | 'client'
      | 'razaoSocial'
      | 'segment'
      | 'contact'
      | 'emailBalanco'
      | 'emailFaturamento'
      | 'volume'
      | 'modality'
      | 'startDate'
      | 'endDate'
      | 'upperLimit'
      | 'lowerLimit'
      | 'medidor'
      | 'seasonalFlexUpper'
      | 'seasonalFlexLower'
      | 'nfVencimentoDias'
    >
  ) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setFormState((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        if (!prev[field as keyof FormErrors]) return prev;
        const next = { ...prev };
        delete next[field as keyof FormErrors];
        return next;
      });
    };

  const handleSupplierChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const supplierName = event.target.value;
    const supplierEmails = getSupplierEmails(supplierName);
    const emailsString = supplierEmails
      .map((email) => email.trim())
      .filter(Boolean)
      .join(', ');
    setFormState((prev) => ({
      ...prev,
      supplier: supplierName,
      emailFaturamento: emailsString,
    }));
  };

  const handleSubmarketChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({ ...prev, submarket: event.target.value as SubmarketOption }));
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as 'Ativo' | 'Inativo';
    setFormState((prev) => ({ ...prev, status: value }));
  };

  const handleEnergySourceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({ ...prev, energySource: event.target.value as EnergySourceOption }));
  };

  const handleVolumeUnitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({ ...prev, volumeUnit: event.target.value as VolumeUnit }));
  };

  const handleNfVencimentoTipoChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({ ...prev, nfVencimentoTipo: event.target.value as 'dias_uteis' | 'dias_corridos' | '' }));
  };

  const handleCnpjChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const masked = formatCnpj(event.target.value);
    setFormState((prev) => ({ ...prev, cnpj: masked }));
    setErrors((prev) => {
      if (!prev.cnpj) return prev;
      const next = { ...prev };
      delete next.cnpj;
      return next;
    });
  };


  // Flat price handlers
  const handleFlatPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeCurrencyInput(event.target.value);
    setFormState((prev) => ({ ...prev, flatPrice: sanitized }));
  };

  const handleFlatPriceBlur = () => {
    setFormState((prev) => ({ ...prev, flatPrice: prev.flatPrice ? formatCurrencyInputBlur(prev.flatPrice) : '' }));
  };

  const handleFlatYearsChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({ ...prev, flatYears: Number(event.target.value) || 1 }));
  };

  const handlePricePeriodsSave = (periods: PricePeriods) => {
    // Persist the full periods payload coming from the modal
    setFormState((prev) => ({ ...prev, pricePeriods: periods }));
    setIsPriceModalOpen(false);
  };

  // removed invoice handlers and price periods handlers — using flat price and no manual invoices

  const validate = React.useCallback(() => {
    const nextErrors: FormErrors = {};
  // invoices removed

    if (!formState.client.trim()) {
      nextErrors.client = 'Informe o cliente';
    }

    if (!isValidCnpj(formState.cnpj)) {
      nextErrors.cnpj = 'Informe um CNPJ válido';
    }

    // Volume contratado removido de contratos manuais

    if (!formState.startDate) {
      nextErrors.startDate = 'Informe o início da vigência';
    }

    if (!formState.endDate) {
      nextErrors.endDate = 'Informe o fim da vigência';
    }

    if (formState.startDate && formState.endDate) {
      const start = new Date(`${formState.startDate}T00:00:00`);
      const end = new Date(`${formState.endDate}T00:00:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        nextErrors.endDate = 'O fim deve ser maior ou igual ao início';
      }
    }

    const upper = Number(formState.upperLimit);
    const lower = Number(formState.lowerLimit);
    const seasonalUpper = formState.seasonalFlexUpper.trim() === '' ? null : Number(formState.seasonalFlexUpper);
    const seasonalLower = formState.seasonalFlexLower.trim() === '' ? null : Number(formState.seasonalFlexLower);

    if (!Number.isFinite(upper) || upper < 0 || upper > 500) {
      nextErrors.upperLimit = 'Flexibilidade Superior deve estar entre 0% e 500%';
    }

    if (!Number.isFinite(lower) || lower < 0 || lower > 500) {
      nextErrors.lowerLimit = 'Flexibilidade inferior deve estar entre 0% e 500%';
    }

    if (
      seasonalUpper !== null &&
      (!Number.isFinite(seasonalUpper) || seasonalUpper < 0 || seasonalUpper > 500)
    ) {
      nextErrors.seasonalFlexUpper = 'Flex sazonal superior deve estar entre 0% e 500%';
    }

    if (
      seasonalLower !== null &&
      (!Number.isFinite(seasonalLower) || seasonalLower < 0 || seasonalLower > 500)
    ) {
      nextErrors.seasonalFlexLower = 'Flex sazonal inferior deve estar entre 0% e 500%';
    }

    if (
      seasonalUpper !== null &&
      seasonalLower !== null &&
      seasonalUpper < seasonalLower
    ) {
      nextErrors.seasonalFlexUpper = 'Flex sazonal superior deve ser maior ou igual ao inferior';
    }

    // Validação de emails (permite múltiplos emails separados por vírgula ou ponto-e-vírgula)
    const validateEmails = (emailString: string): string | null => {
      if (!emailString.trim()) return null; // Email vazio é válido (opcional)
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emails = emailString.split(/[;,]/).map((email) => email.trim()).filter(Boolean);
      
      for (const email of emails) {
        if (!emailRegex.test(email)) {
          return `Email inválido: "${email}". Use o formato correto (exemplo@dominio.com)`;
        }
      }
      
      return null;
    };

    const emailBalancoError = validateEmails(formState.emailBalanco);
    if (emailBalancoError) {
      nextErrors.emailBalanco = emailBalancoError;
    }

    const emailFaturamentoError = validateEmails(formState.emailFaturamento);
    if (emailFaturamentoError) {
      nextErrors.emailFaturamento = emailFaturamentoError;
    }

    if (
      Number.isFinite(upper) &&
      Number.isFinite(lower) &&
      upper >= 0 &&
      lower >= 0 &&
      upper <= 500 &&
      lower <= 500 &&
      upper < lower
    ) {
      nextErrors.upperLimit = 'Flexibilidade Superior deve ser maior ou igual à Inferior';
    }

    // billing cycle removed from manual creation

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formState]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

  const isValid = validate();
    if (!isValid) return;

    const id = ensureId();
    // Volume contratado e preço flat removidos de contratos manuais
    // Usar apenas períodos de preço quando disponíveis
  const periodsAverage = priceSummary.averagePrice ?? 0;
    const priceAverage = priceSummary.filledMonths ? periodsAverage : 0;
  const referenceMonths = deriveReferenceMonths(formState);

    const supplierValue = formState.supplier.trim();
    const normalizeEmails = (value: string) => value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ');
    const legalName = formState.razaoSocial.trim();
    const balanceEmail = normalizeEmails(formState.emailBalanco);
    const billingEmail = normalizeEmails(formState.emailFaturamento);
    const medidorValue = formState.medidor.trim();
    const submarketValue = formState.submarket;
    const seasonalFlexUpperValue = formState.seasonalFlexUpper.trim();
    const seasonalFlexLowerValue = formState.seasonalFlexLower.trim();
    
    console.log('📋 [CreateContractModal] Valores do formulário:', {
      submarket: submarketValue,
      seasonalFlexUpper: seasonalFlexUpperValue,
      seasonalFlexLower: seasonalFlexLowerValue,
      formStateSubmarket: formState.submarket,
      formStateSeasonalFlexUpper: formState.seasonalFlexUpper,
      formStateSeasonalFlexLower: formState.seasonalFlexLower,
    });

    const startMonth = formState.startDate ? formState.startDate.slice(0, 7) : '';
    const endMonth = formState.endDate ? formState.endDate.slice(0, 7) : '';

    const dadosContrato = [
      { label: 'Cliente', value: formState.client.trim() || 'Não informado' },
      { label: 'Razão Social', value: legalName || 'Não informado' },
      { label: 'CNPJ', value: formState.cnpj.trim() || 'Não informado' },
      { label: 'Segmento', value: formState.segment.trim() || 'Não informado' },
      { label: 'Modalidade', value: formState.modality.trim() || 'Não informado' },
      { label: 'Submercado', value: submarketValue || 'Não informado' },
      { label: 'Fonte de energia', value: formState.energySource },
      { label: 'Fornecedor', value: supplierValue || 'Não informado' },
      { label: 'Email de balanço energético', value: balanceEmail || 'Não informado' },
      { label: 'Email de faturamento', value: billingEmail || 'Não informado' },
      {
        label: 'Vigência',
        value:
          startMonth && endMonth
            ? `${formatMesLabel(startMonth)} - ${formatMesLabel(endMonth)}`
            : 'Não informado',
      },
  // ciclo de faturamento removed
      { label: 'Medidor', value: medidorValue || 'Não informado' },
      {
        label: 'Flexibilidade Superior (%)',
        value: `${formState.upperLimit || '0'}%`,
      },
      {
        label: 'Flexibilidade Inferior (%)',
        value: `${formState.lowerLimit || '0'}%`,
      },
      {
        label: 'Sazonalidade - Superior (%)',
        value: seasonalFlexUpperValue ? `${seasonalFlexUpperValue}%` : 'Não informado',
      },
      {
        label: 'Sazonalidade - Inferior (%)',
        value: seasonalFlexLowerValue ? `${seasonalFlexLowerValue}%` : 'Não informado',
      },
      {
        label: 'Vencimento da NF',
        value:
          formState.nfVencimentoTipo && formState.nfVencimentoDias
            ? formState.nfVencimentoTipo === 'dias_uteis'
              ? `${formState.nfVencimentoDias}º dia útil`
              : `${formState.nfVencimentoDias}º dia`
            : 'Não informado',
      },
      { label: 'Responsável', value: formState.contact.trim() || 'Não informado' },
    ];

    const defaultStatus = obrigacaoColunas.slice(1).reduce<Record<string, StatusResumo>>((acc, col) => {
      acc[col] = 'Em análise';
      return acc;
    }, {} as Record<string, StatusResumo>);

    // Energy balance fields removed from contracts; kept only in Balanço energético page
    const historicoDemanda: ContractMock['historicoDemanda'] = [];
    const historicoConsumo: ContractMock['historicoConsumo'] = [];

    const invoices: ContractMock['faturas'] = [];

    // Volume contratado e preço flat removidos de contratos manuais
    const hasPricePeriodsData = formState.pricePeriods.periods.some((period) => {
      const hasMonthsWithPrice = Array.isArray(period.months)
        ? period.months.some((month) => typeof month.price === 'number' && Number.isFinite(month.price))
        : false;
      const hasDefaultPrice = typeof period.defaultPrice === 'number' && Number.isFinite(period.defaultPrice);
      return hasMonthsWithPrice || hasDefaultPrice;
    });

    const serializedPricePeriods = hasPricePeriodsData ? JSON.stringify(formState.pricePeriods) : null;

    const newContract: ContractMock = {
      id,
      codigo: id,
      cliente: formState.client.trim(),
      cnpj: formState.cnpj.trim(),
      segmento: formState.segment.trim(),
      contato: formState.contact.trim(),
      status: formState.status,
      fonte: formState.energySource,
      modalidade: formState.modality.trim(),
      inicioVigencia: formState.startDate,
      fimVigencia: formState.endDate,
      limiteSuperior: `${formState.upperLimit || '0'}%`,
      limiteInferior: `${formState.lowerLimit || '0'}%`,
      flexSazonalSuperior: seasonalFlexUpperValue && seasonalFlexUpperValue !== '' ? `${seasonalFlexUpperValue}%` : null,
      flexSazonalInferior: seasonalFlexLowerValue && seasonalFlexLowerValue !== '' ? `${seasonalFlexLowerValue}%` : null,
      precoMedio: priceAverage,
      fornecedor: supplierValue,
      submercado: submarketValue || undefined,
      razaoSocial: legalName || undefined,
      balanceEmail: balanceEmail || undefined,
      billingEmail: billingEmail || undefined,
      proinfa: null,
  cicloFaturamento: '',
      periodos: referenceMonths,
      resumoConformidades: {
        Consumo: 'Em análise' as StatusResumo,
        NF: 'Em análise' as StatusResumo,
        Fatura: 'Em análise' as StatusResumo,
        Encargos: 'Em análise' as StatusResumo,
        Conformidade: 'Em análise' as StatusResumo,
      },
      kpis: [
        { label: 'Consumo acumulado', value: `${volumeFormatter.format(0)} MWh`, helper: 'Contrato recém-criado' },
        { label: 'Receita Prevista', value: formatCurrencyBRL(0) },
        { label: 'Economia vs Cativo', value: formatCurrencyBRL(0) },
        { label: 'Variação mensal', value: '0%' },
      ],
      dadosContrato,
      historicoDemanda,
      historicoConsumo,
      obrigacoes: referenceMonths.map((mes) => ({
        periodo: formatMesLabel(mes),
        status: { ...defaultStatus },
      })),
      analises: buildAnalises(),
      faturas: invoices,
      // Volume contratado e preço flat removidos de contratos manuais
      pricePeriods: formState.pricePeriods,
      flatPrice: null,
      flatYears: null,
      periodPrice: {
        price_periods: serializedPricePeriods,
        flat_price_mwh: null,
        flat_years: null,
      },
      // Vencimento da NF
      nfVencimentoTipo: formState.nfVencimentoTipo || undefined,
      nfVencimentoDias: formState.nfVencimentoDias ? Number(formState.nfVencimentoDias) : undefined,
    } as ContractMock & { 
      pricePeriods: PricePeriods; 
      flatPrice: number | null; 
      flatYears: number | null;
      nfVencimentoTipo?: 'dias_uteis' | 'dias_corridos';
      nfVencimentoDias?: number;
    };

    console.log('📋 [CreateContractModal] Contrato montado antes de enviar:', {
      id: newContract.id,
      cliente: newContract.cliente,
      submercado: newContract.submercado,
      flexSazonalSuperior: newContract.flexSazonalSuperior,
      flexSazonalInferior: newContract.flexSazonalInferior,
      billingEmail: newContract.billingEmail,
    });

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await onCreate(newContract);
      setFormState(buildInitialFormState());
      setErrors({});
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível criar o contrato. Tente novamente.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  // price summary removed; using flatPrice field

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div
        className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Criar contrato manualmente</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cadastre um novo contrato e inclua os dados de faturamento recebidos manualmente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900"
            aria-label="Fechar modal de criação de contrato"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          {submitError && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              {submitError}
            </div>
          )}

          <div className="space-y-8">
            <section aria-labelledby="dados-principais" className="space-y-4">
              <div>
                <h3 id="dados-principais" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Dados do contrato
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Informe os dados cadastrais, vigência e limites acordados no contrato manual.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Cliente
                  <input
                    type="text"
                    value={formState.client}
                    onChange={handleInputChange('client')}
                    className={`rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                      errors.client ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                    }`}
                    placeholder="Nome do cliente"
                  />
                  {errors.client && <span className="text-xs font-medium text-red-500">{errors.client}</span>}
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Razão Social
                  <input
                    type="text"
                    value={formState.razaoSocial}
                    onChange={handleInputChange('razaoSocial')}
                    className="rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="Razão social do cliente"
                  />
                  <span className="text-xs text-slate-500">Diferente do nome interno</span>
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  CNPJ
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formState.cnpj}
                    onChange={handleCnpjChange}
                    className={`rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                      errors.cnpj ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                    }`}
                    placeholder="00.000.000/0000-00"
                  />
                  {errors.cnpj && <span className="text-xs font-medium text-red-500">{errors.cnpj}</span>}
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Segmento
                  <input
                    type="text"
                    value={formState.segment}
                    onChange={handleInputChange('segment')}
                    className="rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="Ex: Indústria"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Contato responsável
                  <input
                    type="text"
                    value={formState.contact}
                    onChange={handleInputChange('contact')}
                    className="rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="Nome completo"
                  />
                </label>


                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Fonte de energia
                  <select
                    value={formState.energySource}
                    onChange={handleEnergySourceChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {energySourceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Modalidade contratada
                  <input
                    type="text"
                    value={formState.modality}
                    onChange={handleInputChange('modality')}
                    className="rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="Ex: Preço Fixo"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Submercado
                  <select
                    value={formState.submarket}
                    onChange={handleSubmarketChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="">Selecione um submercado</option>
                    {submarketOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Fornecedor
                  <select
                    value={formState.supplier}
                    onChange={handleSupplierChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="">Selecione um fornecedor</option>
                    {SUPPLIER_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Medidor
                  <input
                    type="text"
                    value={formState.medidor}
                    onChange={handleInputChange('medidor')}
                    className="rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="Nome do medidor / grupo"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  E-mail do Balanço
                  <input
                    type="text"
                    value={formState.emailBalanco}
                    onChange={handleInputChange('emailBalanco')}
                    className={`rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                      errors.emailBalanco ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                    }`}
                    placeholder="balanco@exemplo.com ou email1@exemplo.com, email2@exemplo.com"
                  />
                  <span className="text-xs text-slate-500">
                    Usado para envio de relatórios. Separe múltiplos emails por vírgula ou ponto-e-vírgula
                  </span>
                  {errors.emailBalanco && (
                    <span className="text-xs font-medium text-red-500">{errors.emailBalanco}</span>
                  )}
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  E-mail de Faturamento
                  <input
                    type="text"
                    value={formState.emailFaturamento}
                    onChange={handleInputChange('emailFaturamento')}
                    className={`rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                      errors.emailFaturamento ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                    }`}
                    placeholder="faturamento@exemplo.com ou email1@exemplo.com, email2@exemplo.com"
                  />
                  <span className="text-xs text-slate-500">
                    Obrigatório para clientes de atacado. Separe múltiplos emails por vírgula ou ponto-e-vírgula
                  </span>
                  {errors.emailFaturamento && (
                    <span className="text-xs font-medium text-red-500">{errors.emailFaturamento}</span>
                  )}
                </label>


                {/* billing cycle removed from manual contract creation */}

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Flexibilidade Superior
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="0.01"
                    value={formState.upperLimit}
                    onChange={handleInputChange('upperLimit')}
                    className={`rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                      errors.upperLimit ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                    }`}
                    placeholder="100"
                  />
                  {errors.upperLimit && <span className="text-xs font-medium text-red-500">{errors.upperLimit}</span>}
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Flexibilidade Inferior
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="0.01"
                    value={formState.lowerLimit}
                    onChange={handleInputChange('lowerLimit')}
                    className={`rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                      errors.lowerLimit ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                    }`}
                    placeholder="0"
                  />
                  {errors.lowerLimit && <span className="text-xs font-medium text-red-500">{errors.lowerLimit}</span>}
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Sazonalidade - Superior (%)
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="0.01"
                    value={formState.seasonalFlexUpper}
                    onChange={handleInputChange('seasonalFlexUpper')}
                    className={`rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                      errors.seasonalFlexUpper ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                    }`}
                    placeholder="0"
                  />
                  {errors.seasonalFlexUpper && (
                    <span className="text-xs font-medium text-red-500">{errors.seasonalFlexUpper}</span>
                  )}
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Sazonalidade - Inferior (%)
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="0.01"
                    value={formState.seasonalFlexLower}
                    onChange={handleInputChange('seasonalFlexLower')}
                    className={`rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                      errors.seasonalFlexLower ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                    }`}
                    placeholder="0"
                  />
                  {errors.seasonalFlexLower && (
                    <span className="text-xs font-medium text-red-500">{errors.seasonalFlexLower}</span>
                  )}
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Vencimento da NF
                  <div className="flex gap-2">
                    <select
                      value={formState.nfVencimentoTipo}
                      onChange={handleNfVencimentoTipoChange}
                      className="min-w-[140px] rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="">Selecione o tipo</option>
                      <option value="dias_uteis">Dias úteis</option>
                      <option value="dias_corridos">Dias corridos</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      step="1"
                      value={formState.nfVencimentoDias}
                      onChange={handleInputChange('nfVencimentoDias')}
                      disabled={!formState.nfVencimentoTipo}
                      className={`flex-1 rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                        !formState.nfVencimentoTipo
                          ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600'
                          : 'border-slate-300'
                      }`}
                      placeholder={formState.nfVencimentoTipo === 'dias_uteis' ? 'Ex: 6' : 'Ex: 20'}
                    />
                    {formState.nfVencimentoTipo && formState.nfVencimentoDias && (
                      <span className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                        {formState.nfVencimentoTipo === 'dias_uteis'
                          ? `${formState.nfVencimentoDias}º dia útil`
                          : `${formState.nfVencimentoDias}º dia`}
                      </span>
                    )}
                  </div>
                  {errors.nfVencimentoTipo && (
                    <span className="text-xs font-medium text-red-500">{errors.nfVencimentoTipo}</span>
                  )}
                  {errors.nfVencimentoDias && (
                    <span className="text-xs font-medium text-red-500">{errors.nfVencimentoDias}</span>
                  )}
                  <span className="text-xs text-slate-500">
                    Define quando a NF vence em relação ao mês de referência
                  </span>
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300 md:col-span-2">
                  Ciclo de vigência
                  <div className="flex gap-2">
                          <input
                      type="date"
                      value={formState.startDate}
                      onChange={handleInputChange('startDate')}
                      className={`flex-1 rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                        errors.startDate ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                      }`}
                      placeholder="Data início"
                    />
                    <span className="flex items-center text-slate-500">até</span>
                    <input
                      type="date"
                      value={formState.endDate}
                      onChange={handleInputChange('endDate')}
                      className={`flex-1 rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                        errors.endDate ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                      }`}
                      placeholder="Data fim"
                          />
                        </div>
                  {(errors.startDate || errors.endDate) && (
                    <span className="text-xs font-medium text-red-500">
                      {errors.startDate || errors.endDate}
                    </span>
                  )}
                    </label>

                <div className="flex flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 md:col-span-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPriceModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-yn-orange px-3 py-2 text-sm font-semibold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
                      >
                        <PencilLine size={16} /> Editar preços e volumes por período
                      </button>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{priceSummary.filledMonths ? `${priceSummary.filledMonths} meses · ${formatCurrencyBRL(priceSummary.averagePrice ?? 0)}` : 'Nenhum preço por período'}</div>
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="status-contrato" className="space-y-4">
              <div>
                <h3 id="status-contrato" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Status do Contrato
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Selecione o status do contrato.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Status
                  <select
                    value={formState.status}
                    onChange={handleStatusChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="Ativo">Contrato Vigente</option>
                    <option value="Inativo">Contrato encerrado</option>
                  </select>
                </label>
              </div>
            </section>

            {/* manual invoices removed from contracts page; kept in energy balance */}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-yn-orange hover:text-yn-orange dark:border-slate-700 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-yn-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar contrato'}
            </button>
          </div>
        </form>
      </div>

      {isPriceModalOpen && (
        <PricePeriodsModal
          open={isPriceModalOpen}
          value={formState.pricePeriods}
          onClose={() => setIsPriceModalOpen(false)}
          onSave={handlePricePeriodsSave}
          contractStartDate={formState.startDate}
          contractEndDate={formState.endDate}
          flexibilityUpper={(() => {
            // IMPORTANTE: Usa Flexibilidade Superior (upperLimit), NÃO Flexibilidade Sazonalidade
            const rawValue = String(formState.upperLimit || '100').trim();
            const value = parseFloat(rawValue);
            const result = !isNaN(value) && isFinite(value) && value >= 0 ? value : 100;
            console.log('[CreateContractModal] 📤 Passando flexibilityUpper (Flexibilidade Superior) para PricePeriodsModal:', {
              upperLimit: formState.upperLimit,
              seasonalFlexUpper: formState.seasonalFlexUpper,
              result,
              '✅ USANDO': 'Flexibilidade Superior (upperLimit)',
              '❌ NÃO USANDO': 'Flexibilidade Sazonalidade (seasonalFlexUpper)',
            });
            return result;
          })()}
          flexibilityLower={(() => {
            // IMPORTANTE: Usa Flexibilidade Inferior (lowerLimit), NÃO Flexibilidade Sazonalidade
            const rawValue = String(formState.lowerLimit || '0').trim();
            const value = parseFloat(rawValue);
            const result = !isNaN(value) && isFinite(value) && value >= 0 ? value : 0;
            console.log('[CreateContractModal] 📤 Passando flexibilityLower (Flexibilidade Inferior) para PricePeriodsModal:', {
              lowerLimit: formState.lowerLimit,
              seasonalFlexLower: formState.seasonalFlexLower,
              result,
              '✅ USANDO': 'Flexibilidade Inferior (lowerLimit)',
              '❌ NÃO USANDO': 'Flexibilidade Sazonalidade (seasonalFlexLower)',
            });
            return result;
          })()}
        />
      )}
    </div>
  );
}
