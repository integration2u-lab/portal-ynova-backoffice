import React from 'react';
import { X, Plus, Trash2, PencilLine } from 'lucide-react';
import type {
  ContractDetails as ContractMock,
  ContractInvoiceStatus,
  StatusResumo,
  ContractVolumeByYear,
} from '../../types/contracts';
import {
  formatMesLabel,
  obrigacaoColunas,
  summarizePricePeriods,
  normalizeAnnualPricePeriods,
  calculateAdjustedPriceDifference,
  type ContractPricePeriods,
} from '../../types/contracts';
import PricePeriodsModal from './PricePeriodsModal';
import { formatCurrencyBRL, formatCurrencyInputBlur, parseCurrencyInput, sanitizeCurrencyInput } from '../../utils/currency';
import { monthsBetween } from '../../utils/dateRange';
import { SUPPLIERS, SUPPLIER_NAMES, getSupplierEmails } from '../../utils/suppliers';

// Status options for contract creation
const contractStatusOptions = [
  { value: 'Ativo', label: 'Contrato Vigente' },
  { value: 'Inativo', label: 'Contrato encerrado' },
] as const;

const energySourceOptions = ['Convencional', 'Incentivada 50%', 'Incentivada 100%'] as const;
type EnergySourceOption = (typeof energySourceOptions)[number];

const supplierOptions = [
  'Boven Energia',
  'Serena Energia',
  'Bolt Energy',
  'Matrix Energia',
  'Voltta',
  'Newave',
  'Auren',
] as const;

const CUSTOM_SUPPLIER_OPTION = '__custom__';

const volumeUnitOptions = [
  { value: 'MWH', label: 'MWh' },
  { value: 'MW_MEDIO', label: 'MW mÃ©dio' },
] as const;

type VolumeUnit = (typeof volumeUnitOptions)[number]['value'];

type FormErrors = Partial<
  Record<'client' | 'cnpj' | 'volume' | 'startDate' | 'endDate' | 'upperLimit' | 'lowerLimit' | 'flexibility' | 'billingEmail', string>
>;

type FormState = {
  razaoSocial: string;
  client: string;
  razaoSocial: string; // Razão social do cliente
  cnpj: string;
  segment: string;
  contact: string;
  balanceEmail: string; // E-mail do balanço
  billingEmail: string; // E-mail de faturamento
  volume: string;
  volumePrice: string;
  loadPercentage: string;
  volumeUnit: VolumeUnit;
  energySource: EnergySourceOption;
  modality: string;
  supplier: string;
  supplierCustom: string; // Para cadastrar novo fornecedor
  isCustomSupplier: boolean;
  startDate: string;
  endDate: string;
  upperLimit: string;
  lowerLimit: string;
  flexibility: string;
  // Medidor maps to groupName in API
  medidor: string;
  // Flat price (applies to all years) and number of years
  flatPrice: string;
  flatYears: number;
  // Price periods (per-month/periods) — optional detailed pricing
  pricePeriods: PricePeriods;
  // Volume contratado desmembrado por ano
  volumeByYear: ContractVolumeByYear[];
  status: ContractMock['status'];
  vigenciaStatus: 'Vigente' | 'Encerrado';
};

const HOURS_IN_MONTH = 730;
const dayOptions = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0'));
const competenceFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const volumeFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentageFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
      { nome: 'CÃ¡lculo', status: 'amarelo' },
      { nome: 'AnÃ¡lise', status: 'amarelo' },
    ],
  },
  {
    area: 'Faturamento',
    etapas: [
      { nome: 'Dados', status: 'amarelo' },
      { nome: 'CÃ¡lculo', status: 'amarelo' },
      { nome: 'AnÃ¡lise', status: 'amarelo' },
    ],
  },
  {
    area: 'Riscos & ProjeÃ§Ãµes',
    etapas: [
      { nome: 'Dados', status: 'amarelo' },
      { nome: 'CÃ¡lculo', status: 'amarelo' },
      { nome: 'AnÃ¡lise', status: 'amarelo' },
    ],
  },
  {
    area: 'Conformidade',
    etapas: [
      { nome: 'Dados', status: 'amarelo' },
      { nome: 'CÃ¡lculo', status: 'amarelo' },
      { nome: 'AnÃ¡lise', status: 'amarelo' },
    ],
  },
];

const buildInitialFormState = (): FormState => ({
  razaoSocial: '',
  client: '',
  razaoSocial: '',
  cnpj: '',
  segment: '',
  contact: '',
  balanceEmail: '',
  billingEmail: '',
  volume: '',
  volumePrice: '',
  loadPercentage: '',
  volumeUnit: 'MWH',
  energySource: 'Convencional',
  modality: '',
  supplier: '',
  supplierCustom: '',
  isCustomSupplier: false,
  startDate: '',
  endDate: '',
  upperLimit: '200',
  lowerLimit: '0',
  flexibility: '100',
  medidor: '',
  flatPrice: '',
  flatYears: 1,
  pricePeriods: { periods: [] },
  volumeByYear: [],
  status: 'Ativo',
  vigenciaStatus: 'Vigente',
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

const ensureId = (value?: string) => (value && value.trim().length ? value.trim() : `CT-${Date.now()}`);


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
  const flatPriceValue = React.useMemo(() => parseCurrencyInput(formState.flatPrice) ?? 0, [formState.flatPrice]);
  const priceDifference = React.useMemo(
    () => calculateAdjustedPriceDifference(formState.pricePeriods, flatPriceValue),
    [formState.pricePeriods, flatPriceValue]
  );

  const handleInputChange = (
    field: keyof Pick<FormState, 'client' | 'razaoSocial' | 'segment' | 'contact' | 'balanceEmail' | 'billingEmail' | 'volume' | 'modality' | 'supplier' | 'supplierCustom' | 'startDate' | 'endDate' | 'upperLimit' | 'lowerLimit' | 'flexibility' | 'medidor'>
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
    const value = event.target.value;
    if (value === '__CUSTOM__') {
      setFormState((prev) => ({ ...prev, isCustomSupplier: true, supplier: '', supplierCustom: '' }));
    } else {
      const emails = getSupplierEmails(value);
      const emailsStr = emails.join(', ');
      setFormState((prev) => ({
        ...prev,
        isCustomSupplier: false,
        supplier: value,
        supplierCustom: '',
        // Preencher emails automaticamente se não estiverem preenchidos
        balanceEmail: prev.balanceEmail || emailsStr,
        billingEmail: prev.billingEmail || emailsStr,
      }));
    }
  };

  const handleCustomSupplierSubmit = () => {
    if (!formState.supplierCustom.trim() || !formState.billingEmail.trim()) {
      setErrors((prev) => ({
        ...prev,
        billingEmail: 'E-mail é obrigatório ao cadastrar novo fornecedor',
      }));
      return;
    }
    // Adicionar novo fornecedor à lista (em produção, isso faria uma chamada ao backend)
    setFormState((prev) => ({
      ...prev,
      supplier: prev.supplierCustom,
      isCustomSupplier: false,
    }));
  };

  const handleEnergySourceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({ ...prev, energySource: event.target.value as EnergySourceOption }));
  };

  const handleVolumeUnitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({ ...prev, volumeUnit: event.target.value as VolumeUnit }));
  };

  const handleVolumePriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeCurrencyInput(event.target.value);
    setFormState((prev) => ({ ...prev, volumePrice: sanitized }));
    setErrors((prev) => {
      if (!prev.volumePrice) return prev;
      const next = { ...prev };
      delete next.volumePrice;
      return next;
    });
  };

  const handleVolumePriceBlur = () => {
    setFormState((prev) => ({
      ...prev,
      volumePrice: prev.volumePrice ? formatCurrencyInputBlur(prev.volumePrice) : '',
    }));
  };

  const handleSupplierSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({
      ...prev,
      supplierSelection: value,
      supplier: value === CUSTOM_SUPPLIER_OPTION ? '' : value,
      customSupplier: value === CUSTOM_SUPPLIER_OPTION ? prev.customSupplier : '',
    }));
    setErrors((prev) => {
      if (!prev.supplier && !prev.customSupplier) return prev;
      const next = { ...prev };
      if (next.supplier) {
        delete next.supplier;
      }
      if (value !== CUSTOM_SUPPLIER_OPTION && next.customSupplier) {
        delete next.customSupplier;
      }
      return next;
    });
  };

  const handleCustomSupplierChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({
      ...prev,
      customSupplier: value,
      supplier: prev.supplierSelection === CUSTOM_SUPPLIER_OPTION ? value : prev.supplier,
    }));
    setErrors((prev) => {
      if (!prev.customSupplier && !prev.supplier) return prev;
      const next = { ...prev };
      if (next.customSupplier) {
        delete next.customSupplier;
      }
      if (value.trim() && next.supplier) {
        delete next.supplier;
      }
      return next;
    });
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

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as ContractMock['status'];
    setFormState((prev) => ({
      ...prev,
      status: value,
    }));
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

  const handlePricePeriodsSave = (periods: ContractPricePeriods) => {
    const normalized = normalizeAnnualPricePeriods(periods);
    setFormState((prev) => ({ ...prev, pricePeriods: normalized }));
    setIsPriceModalOpen(false);
  };

  // removed invoice handlers and price periods handlers â€” using flat price and no manual invoices

  const validate = React.useCallback(() => {
    const nextErrors: FormErrors = {};

    if (!formState.razaoSocial.trim()) {
      nextErrors.razaoSocial = 'Informe a razão social';
    }

    if (!formState.client.trim()) {
      nextErrors.client = 'Informe o cliente';
    }

    if (!formState.contractCode.trim()) {
      nextErrors.contractCode = 'Informe o código do contrato';
    }

    if (!isValidCnpj(formState.cnpj)) {
      nextErrors.cnpj = 'Informe um CNPJ válido';
    }

    const volumeValue = Number(formState.volume);
    if (!Number.isFinite(volumeValue) || volumeValue <= 0) {
      nextErrors.volume = 'Informe um volume maior que zero';
    }

    const priceValue = parseCurrencyInput(formState.volumePrice);
    if (priceValue === null || priceValue <= 0) {
      nextErrors.volumePrice = 'Informe um preço maior que zero';
    }

    const hasLoadPercentage = formState.loadPercentage.trim().length > 0;
    const loadPercentageValue = Number(formState.loadPercentage);
    if (!hasLoadPercentage) {
      nextErrors.loadPercentage = 'Informe o percentual de carga';
    } else if (!Number.isFinite(loadPercentageValue) || loadPercentageValue < 0 || loadPercentageValue > 100) {
      nextErrors.loadPercentage = 'Percentual deve estar entre 0% e 100%';
    }

    if (!formState.startDate) {
      nextErrors.startDate = 'Informe o início da vigência';
    }

    if (!formState.endDate) {
      nextErrors.endDate = 'Informe o fim da vigência';
    }

    if (formState.startDate && formState.endDate) {
      const startDate = new Date(`${formState.startDate}T00:00:00`);
      const endDate = new Date(`${formState.endDate}T00:00:00`);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
        nextErrors.endDate = 'O fim deve ser maior ou igual ao início';
      }
    }

    // Validar e-mail de faturamento se fornecedor customizado
    if (formState.isCustomSupplier && !formState.billingEmail.trim()) {
      nextErrors.billingEmail = 'E-mail é obrigatório ao cadastrar novo fornecedor';
    }

    const upper = Number(formState.upperLimit);
    const lower = Number(formState.lowerLimit);
    const flex = Number(formState.flexibility);

    if (!Number.isFinite(upper) || upper < 0 || upper > 500) {
      nextErrors.upperLimit = 'Limite superior deve estar entre 0% e 500%';
    }

    if (!Number.isFinite(lower) || lower < 0 || lower > 500) {
      nextErrors.lowerLimit = 'Limite inferior deve estar entre 0% e 500%';
    }

    if (!Number.isFinite(flex) || flex < 0 || flex > 500) {
      nextErrors.flexibility = 'Flexibilidade deve estar entre 0% e 500%';
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
      nextErrors.upperLimit = 'Limite superior deve ser maior ou igual ao inferior';
    }

    const supplierSelection = formState.supplierSelection;
    const supplierCandidate =
      supplierSelection === CUSTOM_SUPPLIER_OPTION
        ? formState.customSupplier.trim()
        : formState.supplier.trim();

    if (!supplierSelection) {
      nextErrors.supplier = 'Selecione um fornecedor';
    } else if (supplierSelection === CUSTOM_SUPPLIER_OPTION && !formState.customSupplier.trim()) {
      nextErrors.customSupplier = 'Informe o novo fornecedor';
    } else if (!supplierCandidate) {
      nextErrors.supplier = 'Selecione um fornecedor';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formState]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!validate()) return;

    const id = ensureId();
    const codigo = formState.contractCode.trim() || id;
    const razaoSocial = formState.razaoSocial.trim();
    const supplierSelection = formState.supplierSelection;
    const supplierValue =
      supplierSelection === CUSTOM_SUPPLIER_OPTION
        ? formState.customSupplier.trim()
        : formState.supplier.trim();

    const normalizedPricePeriods = normalizeAnnualPricePeriods(formState.pricePeriods);
    const submissionSummary = summarizePricePeriods(normalizedPricePeriods);
    const priceAverage =
      submissionSummary.filledMonths && submissionSummary.averagePrice !== null
        ? submissionSummary.averagePrice
        : flatPriceValue;
    const referenceMonths = deriveReferenceMonths(formState);
    const priceSummaryText = priceAverage ? formatCurrencyBRL(priceAverage) : 'Não informado';
    const adjustedDifference = calculateAdjustedPriceDifference(normalizedPricePeriods, flatPriceValue);

    const volumeValue = Number(formState.volume);
    const normalizedVolume =
      formState.volumeUnit === 'MW_MEDIO' ? volumeValue * HOURS_IN_MONTH : volumeValue;
    const volumeBase = Number.isFinite(normalizedVolume) ? normalizedVolume : 0;

    const supplierValue = formState.isCustomSupplier ? formState.supplierCustom.trim() : formState.supplier.trim();

    const startMonth = formState.startDate ? formState.startDate.slice(0, 7) : '';
    const endMonth = formState.endDate ? formState.endDate.slice(0, 7) : '';

    const dadosContrato = [
      { label: 'Razão social', value: razaoSocial || 'Não informado' },
      { label: 'Cliente', value: formState.client.trim() || 'Não informado' },
      { label: 'Razão Social', value: formState.razaoSocial.trim() || formState.client.trim() || 'Não informado' },
      { label: 'CNPJ', value: formState.cnpj.trim() || 'Não informado' },
      { label: 'Segmento', value: formState.segment.trim() || 'Não informado' },
      { label: 'Modalidade', value: formState.modality.trim() || 'Não informado' },
      { label: 'Fonte de energia', value: formState.energySource },
      { label: 'Fornecedor', value: supplierValue || 'Não informado' },
      {
        label: 'Vigência',
        value:
          startMonth && endMonth
            ? `${formatMesLabel(startMonth)} - ${formatMesLabel(endMonth)}`
            : 'Não informado',
      },
      { label: 'Medidor', value: formState.medidor.trim() || 'Não informado' },
      {
        label: 'Flex / Limites',
        value: `${formState.flexibility || '0'}% (${formState.lowerLimit || '0'}% - ${formState.upperLimit || '0'}%)`,
      },
      {
        label: 'Volume contratado',
        value: Number.isFinite(volumeValue)
          ? `${volumeFormatter.format(volumeValue)} ${
              formState.volumeUnit === 'MW_MEDIO' ? 'MW médio' : 'MWh'
            }`
          : 'Não informado',
      },
      { label: 'Preço flat (R$/MWh)', value: priceSummaryText },
      { label: 'E-mail Balanço', value: formState.balanceEmail.trim() || 'Não informado' },
      { label: 'E-mail Faturamento', value: formState.billingEmail.trim() || 'Não informado' },
      { label: 'Responsável', value: formState.contact.trim() || 'Não informado' },
    ];

    const defaultStatus = obrigacaoColunas.slice(1).reduce<Record<string, StatusResumo>>((acc, col) => {
      acc[col] = 'Em análise';
      return acc;
    }, {} as Record<string, StatusResumo>);

    const historicoDemanda: ContractMock['historicoDemanda'] = [];
    const historicoConsumo: ContractMock['historicoConsumo'] = [];

    const newContract: ContractMock = {
      id,
      codigo,
      razaoSocial: razaoSocial || formState.client.trim(),
      cliente: formState.client.trim(),
      razaoSocial: formState.razaoSocial.trim() || undefined, // Will be sent as social_reason to API - empty string becomes undefined
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
      flex: `${formState.flexibility || '0'}%`,
      precoMedio: priceAverage,
      fornecedor: supplierValue,
      cicloFaturamento: '',
      balanceEmail: formState.balanceEmail.trim() || undefined,
      billingEmail: formState.billingEmail.trim() || undefined,
      volumeByYear: formState.volumeByYear.length > 0 ? formState.volumeByYear : undefined,
      periodos: referenceMonths,
      resumoConformidades: {
        Consumo: 'Em análise',
        NF: 'Em análise',
        Fatura: 'Em análise',
        Encargos: 'Em análise',
        Conformidade: 'Em análise',
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
      faturas: [],
    };

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onCreate(newContract);
      setFormState(buildInitialFormState());
      setErrors({});
    } catch (error) {
      console.error('[CreateContractModal] Falha ao criar contrato.', error);
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
            aria-label="Fechar modal de criaÃ§Ã£o de contrato"
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
                  Informe os dados cadastrais, vigÃªncia e limites acordados no contrato manual.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Razão social
                  <input
                    type="text"
                    value={formState.razaoSocial}
                    onChange={handleInputChange('razaoSocial')}
                    className={`rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                      errors.razaoSocial ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                    }`}
                    placeholder="Razão social completa"
                  />
                  {errors.razaoSocial && <span className="text-xs font-medium text-red-500">{errors.razaoSocial}</span>}
                </label>

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
                    placeholder="Ex: IndÃºstria"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Contato responsÃ¡vel
                  <input
                    type="text"
                    value={formState.contact}
                    onChange={handleInputChange('contact')}
                    className="rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="Nome completo"
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-3">
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Volume contratado
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formState.volume}
                        onChange={handleInputChange('volume')}
                        className={`w-full rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                          errors.volume ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                        }`}
                        placeholder="0,00"
                      />
                      <select
                        value={formState.volumeUnit}
                        onChange={handleVolumeUnitChange}
                        className="min-w-[130px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                      >
                        {volumeUnitOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.volume && <span className="text-xs font-medium text-red-500">{errors.volume}</span>}
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Preço contratado (R$/MWh)
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formState.volumePrice}
                        onChange={handleVolumePriceChange}
                        onBlur={handleVolumePriceBlur}
                        className={`w-full rounded-lg border px-3 py-2 pl-7 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                          errors.volumePrice ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                        }`}
                        placeholder="0,00"
                      />
                    </div>
                    {errors.volumePrice && <span className="text-xs font-medium text-red-500">{errors.volumePrice}</span>}
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Percentual de carga (%)
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formState.loadPercentage}
                        onChange={handleInputChange('loadPercentage')}
                        className={`w-full rounded-lg border px-3 py-2 pr-9 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                          errors.loadPercentage ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                        }`}
                        placeholder="0,00"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        %
                      </span>
                    </div>
                    {errors.loadPercentage && (
                      <span className="text-xs font-medium text-red-500">{errors.loadPercentage}</span>
                    )}
                  </label>
                </div>

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
                    placeholder="Ex: PreÃ§o Fixo"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Fornecedor
                  <select
                    value={formState.isCustomSupplier ? '__CUSTOM__' : formState.supplier}
                    onChange={handleSupplierChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="">Selecione um fornecedor</option>
                    {SUPPLIER_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    <option value="__CUSTOM__">Cadastrar novo fornecedor</option>
                  </select>
                  {formState.isCustomSupplier && (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={formState.supplierCustom}
                        onChange={handleInputChange('supplierCustom')}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                        placeholder="Nome do novo fornecedor"
                      />
                      <button
                        type="button"
                        onClick={handleCustomSupplierSubmit}
                        className="w-full rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                      >
                        Confirmar novo fornecedor
                      </button>
                    </div>
                  )}
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
                    type="email"
                    value={formState.balanceEmail}
                    onChange={handleInputChange('balanceEmail')}
                    className="rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="balanco@exemplo.com"
                  />
                  <span className="text-xs text-slate-500">Usado para envio de relatórios</span>
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  E-mail de Faturamento
                  <input
                    type="email"
                    value={formState.billingEmail}
                    onChange={handleInputChange('billingEmail')}
                    className={`rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                      errors.billingEmail ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                    }`}
                    placeholder="faturamento@exemplo.com"
                  />
                  <span className="text-xs text-slate-500">Obrigatório para clientes de atacado</span>
                  {errors.billingEmail && <span className="text-xs font-medium text-red-500">{errors.billingEmail}</span>}
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Ciclo de vigÃªncia
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={formState.startDate}
                      onChange={handleInputChange('startDate')}
                      className={`flex-1 rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                        errors.startDate ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                      }`}
                      placeholder="Data inÃ­cio"
                    />
                    <span className="flex items-center text-slate-500">atÃ©</span>
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

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Situação da vigência
                  <select
                    value={formState.vigenciaStatus}
                    onChange={handleInputChange('vigenciaStatus')}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="Vigente">Vigente</option>
                    <option value="Encerrado">Encerrado</option>
                  </select>
                </label>

                {/* billing cycle removed from manual contract creation */}

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Limite superior (%)
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
                    placeholder="200"
                  />
                  {errors.upperLimit && <span className="text-xs font-medium text-red-500">{errors.upperLimit}</span>}
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Limite inferior (%)
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
                  Flexibilidade (%)
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="0.01"
                    value={formState.flexibility}
                    onChange={handleInputChange('flexibility')}
                    className={`rounded-lg border px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950 ${
                      errors.flexibility ? 'border-red-400 dark:border-red-500/60' : 'border-slate-300'
                    }`}
                    placeholder="100"
                  />
                  {errors.flexibility && <span className="text-xs font-medium text-red-500">{errors.flexibility}</span>}
                </label>

                <div className="flex flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 md:col-span-2">
                  <div className="grid md:grid-cols-3 gap-2 items-center">
                    <label className="flex flex-col gap-1 md:col-span-2">
                      PreÃ§o flat (R$/MWh)
                      <div className="flex gap-2 items-center">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">R$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={formState.flatPrice}
                            onChange={handleFlatPriceChange}
                            onBlur={handleFlatPriceBlur}
                            placeholder="0,00"
                            className="w-full rounded-lg border px-3 py-2 pl-7 text-sm shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                          />
                        </div>
                        <select value={String(formState.flatYears)} onChange={handleFlatYearsChange} className="min-w-[120px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm">
                          {[1,2,3,4,5,6,7,8,9,10].map((y) => <option key={y} value={String(y)}>{y} ano{y>1?'s':''}</option>)}
                        </select>
                      </div>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPriceModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-yn-orange px-3 py-2 text-sm font-semibold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
                      >
                        <PencilLine size={16} /> Valor por Período
                      </button>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{priceSummary.filledMonths ? `${priceSummary.filledMonths} meses Â· ${formatCurrencyBRL(priceSummary.averagePrice ?? 0)}` : 'Nenhum valor por período'}</div>
                    </div>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Preço reajustado (diferença):{' '}
                    <span className="text-slate-700 dark:text-slate-200">{formatCurrencyBRL(priceDifference)}</span>
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Status
                  <select
                    value={formState.status}
                    onChange={handleStatusChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {contractStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
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
        />
      )}
    </div>
  );
}




