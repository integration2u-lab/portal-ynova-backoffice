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

const resumoStatusOptions: StatusResumo[] = ['Conforme', 'Em análise', 'Divergente'];

const energySourceOptions = ['Incentivada 0%', 'Incentivada 50%', 'Incentivada 100%'] as const;
type EnergySourceOption = (typeof energySourceOptions)[number];

const volumeUnitOptions = [
  { value: 'MWH', label: 'MWh' },
  { value: 'MW_MEDIO', label: 'MW médio' },
] as const;

type VolumeUnit = (typeof volumeUnitOptions)[number]['value'];

type FormErrors = Partial<
  Record<'client' | 'cnpj' | 'volume' | 'startDate' | 'endDate' | 'upperLimit' | 'lowerLimit' | 'flexibility' | 'email', string>
>;

type FormState = {
  client: string;
  cnpj: string;
  segment: string;
  contact: string;
  email: string; // Novo campo para emails múltiplos
  volume: string;
  volumeUnit: VolumeUnit;
  energySource: EnergySourceOption;
  modality: string;
  supplier: string;
  proinfa: string;
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
  resumoConformidades: ContractMock['resumoConformidades'];
  status: ContractMock['status'];
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
  cnpj: '',
  segment: '',
  contact: '',
  email: '', // Novo campo para emails múltiplos
  volume: '',
  volumeUnit: 'MWH',
  energySource: 'Incentivada 0%',
  modality: '',
  supplier: '',
  proinfa: '',
  startDate: '',
  endDate: '',
  upperLimit: '200',
  lowerLimit: '0',
  flexibility: '100',
  medidor: '',
  flatPrice: '',
  flatYears: 1,
  pricePeriods: { periods: [] },
  resumoConformidades: {
    Consumo: 'Em análise',
    NF: 'Em análise',
    Fatura: 'Em análise',
    Encargos: 'Em análise',
    Conformidade: 'Em análise',
  },
  status: 'Ativo',
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

const parseProinfa = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value.replace('.', '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
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
    field: keyof Pick<FormState, 'client' | 'segment' | 'contact' | 'email' | 'volume' | 'modality' | 'supplier' | 'proinfa' | 'startDate' | 'endDate' | 'upperLimit' | 'lowerLimit' | 'flexibility' | 'medidor'>
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

  const handleEnergySourceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({ ...prev, energySource: event.target.value as EnergySourceOption }));
  };

  const handleVolumeUnitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({ ...prev, volumeUnit: event.target.value as VolumeUnit }));
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

  const handleResumoChange = (chave: keyof ContractMock['resumoConformidades']) =>
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value as StatusResumo;
      setFormState((prev) => ({
        ...prev,
        resumoConformidades: {
          ...prev.resumoConformidades,
          [chave]: value,
        },
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

    const volumeValue = Number(formState.volume);
    if (!Number.isFinite(volumeValue) || volumeValue <= 0) {
      nextErrors.volume = 'Informe um volume maior que zero';
    }

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
  // prefer detailed periods average when available, otherwise use flat price
  const periodsAverage = priceSummary.averagePrice ?? 0;
  const flatAverage = parseCurrencyInput(formState.flatPrice) ?? 0;
  const priceAverage = priceSummary.filledMonths ? periodsAverage : flatAverage;
  const referenceMonths = deriveReferenceMonths(formState);
  const priceSummaryText = priceAverage ? formatCurrencyBRL(priceAverage) : 'Não informado';

    const volumeValue = Number(formState.volume);
    const normalizedVolume =
      formState.volumeUnit === 'MW_MEDIO' ? volumeValue * HOURS_IN_MONTH : volumeValue;
    const volumeBase = Number.isFinite(normalizedVolume) ? normalizedVolume : 0;

    const supplierValue = formState.supplier.trim();
    const proinfaNumber = parseProinfa(formState.proinfa);
    const proinfaDisplay =
      proinfaNumber === null
        ? 'Não informado'
        : proinfaNumber.toLocaleString('pt-BR', {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          });

    const startMonth = formState.startDate ? formState.startDate.slice(0, 7) : '';
    const endMonth = formState.endDate ? formState.endDate.slice(0, 7) : '';

    const dadosContrato = [
      { label: 'Cliente', value: formState.client.trim() || 'Não informado' },
      { label: 'CNPJ', value: formState.cnpj.trim() || 'Não informado' },
      { label: 'Segmento', value: formState.segment.trim() || 'Não informado' },
      { label: 'Modalidade', value: formState.modality.trim() || 'Não informado' },
      { label: 'Fonte', value: formState.energySource },
      { label: 'Fornecedor', value: supplierValue || 'Não informado' },
      { label: 'Proinfa', value: proinfaDisplay },
      {
        label: 'Vigência',
        value:
          startMonth && endMonth
            ? `${formatMesLabel(startMonth)} - ${formatMesLabel(endMonth)}`
            : 'Não informado',
      },
  // ciclo de faturamento removed
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

    const newContract: ContractMock = {
      id,
      codigo: id,
      cliente: formState.client.trim(),
      cnpj: formState.cnpj.trim(),
      segmento: formState.segment.trim(),
      contato: formState.contact.trim(),
      status: formState.status,
      fonte: formState.energySource.includes('0%') ? 'Convencional' : 'Incentivada',
      modalidade: formState.modality.trim(),
      inicioVigencia: formState.startDate,
      fimVigencia: formState.endDate,
      limiteSuperior: `${formState.upperLimit || '0'}%`,
      limiteInferior: `${formState.lowerLimit || '0'}%`,
      flex: `${formState.flexibility || '0'}%`,
      precoMedio: priceAverage,
      fornecedor: supplierValue,
      proinfa: proinfaNumber,
  cicloFaturamento: '',
      periodos: referenceMonths,
      resumoConformidades: { ...formState.resumoConformidades },
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
      // Adiciona pricePeriods e flatPrice para serem enviados ao backend
      pricePeriods: formState.pricePeriods,
      flatPrice: parseCurrencyInput(formState.flatPrice) ?? null,
      flatYears: formState.flatYears,
    } as ContractMock & { pricePeriods: PricePeriods; flatPrice: number | null; flatYears: number };

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

                <div className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <span>Volume contratado</span>
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
                    placeholder="Ex: Preço Fixo"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Fornecedor
                  <input
                    type="text"
                    value={formState.supplier}
                    onChange={handleInputChange('supplier')}
                    className="rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="Nome do fornecedor"
                  />
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
                  Proinfa (MWh)
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formState.proinfa}
                    onChange={handleInputChange('proinfa')}
                    className="rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="0,000"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Email
                  <input
                    type="email"
                    value={formState.email}
                    onChange={handleInputChange('email')}
                    className="rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="email1@exemplo.com, email2@exemplo.com"
                    multiple
                  />
                  <span className="text-xs text-slate-500">Separe múltiplos emails com vírgula</span>
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
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
                      Preço flat (R$/MWh)
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
                        <PencilLine size={16} /> Editar preços por período
                      </button>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{priceSummary.filledMonths ? `${priceSummary.filledMonths} meses · ${formatCurrencyBRL(priceSummary.averagePrice ?? 0)}` : 'Nenhum preço por período'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="resumo-conformidades" className="space-y-4">
              <div>
                <h3 id="resumo-conformidades" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Resumo de conformidades
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ajuste o status inicial dos principais indicadores de conformidade do contrato.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(formState.resumoConformidades) as Array<keyof ContractMock['resumoConformidades']>).map(
                  (chave) => (
                    <label key={chave} className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                      {chave}
                      <select
                        value={formState.resumoConformidades[chave]}
                        onChange={handleResumoChange(chave)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                      >
                        {resumoStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  )
                )}
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
