import React from 'react';
import { X } from 'lucide-react';
import {
  type ContractMock,
  type StatusResumo,
  type AnaliseArea,
  obrigacaoColunas,
  formatMesLabel,
} from '../../mocks/contracts';

const resumoStatusOptions: StatusResumo[] = ['Conforme', 'Em análise', 'Divergente'];
type VolumeUnit = 'MWh' | 'MWm';

type FormState = {
  cliente: string;
  cnpj: string;
  segmento: string;
  contato: string;
  status: ContractMock['status'];
  fonte: ContractMock['fonte'];
  modalidade: string;
  inicioVigencia: string;
  fimVigencia: string;
  limiteSuperior: string;
  limiteInferior: string;
  flex: string;
  precosMedios: string[];
  supplier: string;
  proinfa: string;
  cicloFaturamento: string;
  volumeContratado: string;
  volumeContratadoUnidade: VolumeUnit;
  resumoConformidades: ContractMock['resumoConformidades'];
};

type CreateContractModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (contract: ContractMock) => Promise<ContractMock>;
};

function buildInitialFormState(): FormState {
  return {
    cliente: '',
    cnpj: '',
    segmento: '',
    contato: '',
    status: 'Ativo',
    fonte: 'Incentivada 50%',
    modalidade: '',
    inicioVigencia: '',
    fimVigencia: '',
    limiteSuperior: '200%',
    limiteInferior: '0%',
    flex: '100%',
    precosMedios: [''],
    supplier: '',
    proinfa: '',
    cicloFaturamento: '',
    volumeContratado: '',
    volumeContratadoUnidade: 'MWh',
    resumoConformidades: {
      Consumo: 'Em análise',
      NF: 'Em análise',
      Fatura: 'Em análise',
      Encargos: 'Em análise',
      Conformidade: 'Em análise',
    },
  };
}

function formatCurrencyInput(value: string) {
  if (!value) return 'R$ 0,00';
  const parsed = Number(value.replace(',', '.'));
  if (Number.isNaN(parsed)) return 'R$ 0,00';
  return parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getReferenceMonths(base: string, total = 6) {
  const months: string[] = [];
  const reference = base ? new Date(`${base}-01T00:00:00`) : new Date();
  reference.setDate(1);
  for (let i = total - 1; i >= 0; i -= 1) {
    const current = new Date(reference);
    current.setMonth(reference.getMonth() - i);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }
  return months;
}

function buildAnalises(): AnaliseArea[] {
  return [
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
}

function parseNumberInput(value: string): number {
  if (!value) return NaN;
  return Number(value.replace(',', '.'));
}

function getHoursInMonth(reference?: string): number {
  if (!reference) {
    const now = new Date();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return days * 24;
  }
  const date = new Date(`${reference}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date();
    const days = new Date(fallback.getFullYear(), fallback.getMonth() + 1, 0).getDate();
    return days * 24;
  }
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return days * 24;
}

function convertVolumeToMWh(value: number, unit: VolumeUnit, reference?: string): number {
  if (!Number.isFinite(value)) return 0;
  if (unit === 'MWm') {
    const hours = getHoursInMonth(reference);
    return value * hours;
  }
  return value;
}

function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
}

function computeContractYears(inicio: string, fim: string): number {
  if (!inicio || !fim) return 1;
  const start = new Date(inicio);
  const end = new Date(fim);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  if (end.getTime() < start.getTime()) return 1;
  return end.getFullYear() - start.getFullYear() + 1;
}
function ensureId(value?: string) {
  return value && value.trim().length > 0 ? value.trim() : `CT-${Date.now()}`;
}

export default function CreateContractModal({ open, onClose, onCreate }: CreateContractModalProps) {
  const [formState, setFormState] = React.useState<FormState>(() => buildInitialFormState());
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const baseInputClasses =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-gray-200 dark:bg-white dark:text-gray-900';
  const currencyWrapperClasses =
    'flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus-within:border-yn-orange focus-within:outline-none focus-within:ring-2 focus-within:ring-yn-orange/40 dark:border-gray-200 dark:bg-white';
  React.useEffect(() => {
    const anos = computeContractYears(formState.inicioVigencia, formState.fimVigencia);
    setFormState((prev) => {
      if (prev.precosMedios.length === anos) return prev;
      const next = prev.precosMedios.slice(0, anos);
      while (next.length < anos) {
        next.push('');
      }
      return { ...prev, precosMedios: next };
    });
  }, [formState.inicioVigencia, formState.fimVigencia]);

  React.useEffect(() => {
    if (!open) {
      setFormState(buildInitialFormState());
      setErrors({});
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleInputChange = (
    field: keyof FormState,
    formatter?: (value: string) => string
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = formatter ? formatter(event.target.value) : event.target.value;
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleResumoChange =
    (chave: keyof ContractMock['resumoConformidades']) =>
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

  const handlePrecoMedioChange = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormState((prev) => {
      const precosMedios = [...prev.precosMedios];
      precosMedios[index] = value;
      return { ...prev, precosMedios };
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formState.cliente.trim()) nextErrors.cliente = 'Informe o cliente';
    if (!formState.cnpj.trim()) nextErrors.cnpj = 'Informe o CNPJ';
    if (!formState.cicloFaturamento.trim()) nextErrors.cicloFaturamento = 'Informe o ciclo de faturamento';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate() || isSubmitting) return;

    const id = ensureId();
    const months = getReferenceMonths(formState.cicloFaturamento || undefined);
    const periodos = Array.from(new Set([formState.cicloFaturamento, ...months].filter(Boolean))) as string[];

    const defaultStatus = obrigacaoColunas.slice(1).reduce<Record<string, StatusResumo>>((acc, col) => {
      acc[col] = 'Em análise';
      return acc;
    }, {} as Record<string, StatusResumo>);

    const volumeBaseNumber = parseNumberInput(formState.volumeContratado);
    const referencePeriodo = formState.cicloFaturamento || months[months.length - 1] || '';
    const volumeEmMWh = convertVolumeToMWh(volumeBaseNumber, formState.volumeContratadoUnidade, referencePeriodo);

    const historicoDemanda = months.map((mes, index) => ({
      mes,
      ponta: 0 + index * 5,
      foraPonta: 0 + index * 4,
    }));

    const historicoConsumo = months.map((mes, index) => ({
      mes,
      meta: volumeEmMWh,
      realizado: Math.max(0, volumeEmMWh - index * 25),
    }));

    const supplierValue = formState.supplier.trim();
    const proinfaRaw = formState.proinfa.trim();
    const proinfaNumber = proinfaRaw ? Number(proinfaRaw.replace(',', '.')) : NaN;
    const proinfaDisplay = proinfaRaw
      ? Number.isNaN(proinfaNumber)
        ? proinfaRaw
        : proinfaNumber.toLocaleString('pt-BR', {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          })
      : 'Não informado';

    const volumeDisplay =
      formState.volumeContratado
        ? formState.volumeContratadoUnidade === 'MWm'
          ? `${formState.volumeContratado} MW médio (~${formatDecimal(volumeEmMWh)} MWh)`
          : `${formState.volumeContratado} MWh/hr`
        : 'Não informado';
    const precosMediosFormatados =
      formState.precosMedios.length > 0
        ? formState.precosMedios
            .map((valor, index) =>
              valor.trim()
                ? `${index + 1}º ano: ${formatCurrencyInput(valor)}`
                : `${index + 1}º ano: Não informado`
            )
            .join(' | ')
        : 'Não informado';
    const precosMediosNumericos = formState.precosMedios.map((valor) => {
      const parsed = parseNumberInput(valor);
      return Number.isNaN(parsed) ? 0 : parsed;
    });
    const dadosContrato = [
      { label: 'Cliente', value: formState.cliente.trim() },
      { label: 'Segmento', value: formState.segmento.trim() || 'Não informado' },
      { label: 'Modalidade', value: formState.modalidade.trim() || 'Não informado' },
      { label: 'Fonte', value: formState.fonte },
      { label: 'Fornecedor', value: supplierValue || 'Não informado' },
      { label: 'Proinfa', value: proinfaDisplay },
      {
        label: 'Vigência',
        value:
          formState.inicioVigencia && formState.fimVigencia
            ? `${formatMesLabel(formState.inicioVigencia.slice(0, 7))} - ${formatMesLabel(
                formState.fimVigencia.slice(0, 7)
              )}`
            : 'Não informado',
      },
      {
        label: 'Flex / Limites',
        value: `${formState.flex || 'N/I'} (${formState.limiteInferior || 'N/I'} - ${formState.limiteSuperior || 'N/I'})`,
      },
      {
        label: 'Preços médios',
        value: precosMediosFormatados,
      },
      {
        label: 'Volume Contratado',
        value: volumeDisplay,
      },
      {
        label: 'Responsável',
        value: formState.contato.trim() || 'Não informado',
      },
    ];

    const newContract: ContractMock = {
      id,
      codigo: id,
      cliente: formState.cliente.trim(),
      cnpj: formState.cnpj.trim(),
      segmento: formState.segmento.trim() || 'Não informado',
      contato: formState.contato.trim() || 'Não informado',
      status: formState.status,
      fonte: formState.fonte,
      modalidade: formState.modalidade.trim() || 'Não informado',
      inicioVigencia: formState.inicioVigencia || '',
      fimVigencia: formState.fimVigencia || '',
      limiteSuperior: formState.limiteSuperior || 'N/I',
      limiteInferior: formState.limiteInferior || 'N/I',
      flex: formState.flex || 'N/I',
      precoMedio: precosMediosNumericos[0] || 0,
      fornecedor: supplierValue,
      proinfa: Number.isNaN(proinfaNumber) ? null : proinfaNumber,
      cicloFaturamento: formState.cicloFaturamento,
      periodos,
      resumoConformidades: { ...formState.resumoConformidades },
      kpis: [
        { label: 'Consumo acumulado', value: '0 MWh', helper: 'Contrato recém-criado' },
        { label: 'Receita Prevista', value: 'R$ 0,00' },
        { label: 'Economia vs Cativo', value: 'R$ 0,00' },
        { label: 'Variação mensal', value: '0%' },
      ],
      dadosContrato,
      historicoDemanda,
      historicoConsumo,
      obrigacoes: months.map((mes) => ({
        periodo: formatMesLabel(mes),
        status: { ...defaultStatus },
      })),
      analises: buildAnalises(),
      precosMedios: precosMediosNumericos,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div
        className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Criar contrato manualmente</h2>
            <p className="text-sm text-gray-500">
              Cadastre um novo contrato e inclua os dados de faturamento recebidos manualmente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar modal de criação de contrato"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          {submitError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}
          <div className="space-y-6">
            <section aria-labelledby="dados-principais" className="space-y-4">
              <div>
                <h3 id="dados-principais" className="text-base font-semibold text-gray-900">
                  Dados principais
                </h3>
                <p className="text-sm text-gray-500">
                  Defina informações de identificação e vigência do contrato manual.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Cliente
                  <input
                    type="text"
                    value={formState.cliente}
                    onChange={handleInputChange('cliente')}
                    className={`${baseInputClasses} ${
                      errors.cliente ? 'border-red-400 focus:border-red-400 focus:ring-red-300/60' : ''
                    }`}
                    placeholder="Nome do cliente"
                  />
                  {errors.cliente && <span className="text-xs font-medium text-red-500">{errors.cliente}</span>}
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  CNPJ
                  <input
                    type="text"
                    value={formState.cnpj}
                    onChange={handleInputChange('cnpj')}
                    className={`${baseInputClasses} ${
                      errors.cnpj ? 'border-red-400 focus:border-red-400 focus:ring-red-300/60' : ''
                    }`}
                    placeholder="00.000.000/0000-00"
                  />
                  {errors.cnpj && <span className="text-xs font-medium text-red-500">{errors.cnpj}</span>}
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Segmento
                  <input
                    type="text"
                    value={formState.segmento}
                    onChange={handleInputChange('segmento')}
                    className={baseInputClasses}
                    placeholder="Ex: Indústria"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Contato responsável
                  <input
                    type="text"
                    value={formState.contato}
                    onChange={handleInputChange('contato')}
                    className={baseInputClasses}
                    placeholder="Nome completo"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Volume contratado
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="number"
                      min="0"
                      value={formState.volumeContratado}
                      onChange={handleInputChange('volumeContratado')}
                      className={`${baseInputClasses} flex-1`}
                      placeholder="Ex: 3200"
                    />
                    <select
                      value={formState.volumeContratadoUnidade}
                      onChange={handleInputChange('volumeContratadoUnidade')}
                      className={`${baseInputClasses} sm:w-36`}
                    >
                      <option value="MWh">MWh/hr</option>
                      <option value="MWm">MW médio</option>
                    </select>
                  </div>
                  {formState.volumeContratadoUnidade === 'MWm' && (
                    <span className="text-xs text-gray-500">
                      Convertido automaticamente para MWh multiplicando pelas horas do mes selecionado.
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Fonte de energia
                  <select
                    value={formState.fonte}
                    onChange={handleInputChange('fonte')}
                    className={baseInputClasses}
                  >
                    {['Incentivada 50%', 'Incentivada 100%', 'Incentivada 0%'].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Modalidade contratada
                  <input
                    type="text"
                    value={formState.modalidade}
                    onChange={handleInputChange('modalidade')}
                    className={baseInputClasses}
                    placeholder="Ex: Preço Fixo"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Fornecedor
                  <input
                    type="text"
                    value={formState.supplier}
                    onChange={handleInputChange('supplier')}
                    className={baseInputClasses}
                    placeholder="Ex: Bolt"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Proinfa
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={formState.proinfa}
                    onChange={handleInputChange('proinfa')}
                    className={baseInputClasses}
                    placeholder="Ex: 0.219"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Início da vigência
                  <input
                    type="date"
                    value={formState.inicioVigencia}
                    onChange={handleInputChange('inicioVigencia')}
                    className={baseInputClasses}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Fim da vigência
                  <input
                    type="date"
                    value={formState.fimVigencia}
                    onChange={handleInputChange('fimVigencia')}
                    className={baseInputClasses}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Ciclo de faturamento
                  <input
                    type="month"
                    value={formState.cicloFaturamento}
                    onChange={handleInputChange('cicloFaturamento')}
                    className={`${baseInputClasses} ${
                      errors.cicloFaturamento ? 'border-red-400 focus:border-red-400 focus:ring-red-300/60' : ''
                    }`}
                    aria-label="Selecionar ciclo de faturamento"
                  />
                  {errors.cicloFaturamento && (
                    <span className="text-xs font-medium text-red-500">{errors.cicloFaturamento}</span>
                  )}
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Limite superior
                  <input
                    type="text"
                    value={formState.limiteSuperior}
                    onChange={handleInputChange('limiteSuperior')}
                    className={baseInputClasses}
                    placeholder="Ex: 200%"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Limite inferior
                  <input
                    type="text"
                    value={formState.limiteInferior}
                    onChange={handleInputChange('limiteInferior')}
                    className={baseInputClasses}
                    placeholder="Ex: 0%"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Flexibilidade
                  <input
                    type="text"
                    value={formState.flex}
                    onChange={handleInputChange('flex')}
                    className={baseInputClasses}
                    placeholder="Ex: 100%"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Preços médios (R$ / MWh)
                  <span className="text-xs text-gray-500">
                    Informe os valores em reais para cada ano do contrato (total de {formState.precosMedios.length}{' '}
                    {formState.precosMedios.length === 1 ? 'valor' : 'valores'}).
                  </span>
                  <div className="mt-2 space-y-2">
                    {formState.precosMedios.map((valor, index) => (
                      <div key={`preco-medio-${index}`} className="flex items-center gap-3">
                        <span className="w-24 text-xs font-semibold text-gray-600">{index + 1}º ano</span>
                        <div className={currencyWrapperClasses}>
                          <span className="text-xs font-semibold text-gray-500">R$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={valor}
                            onChange={handlePrecoMedioChange(index)}
                            className="w-full border-none bg-transparent p-0 text-sm text-gray-900 focus:outline-none focus:ring-0"
                            placeholder="275,50"
                            aria-label={`Preço médio do ${index + 1}º ano em reais`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </label>
              </div>
            </section>

            <section aria-labelledby="resumo-conformidades" className="space-y-4">
              <div>
                <h3 id="resumo-conformidades" className="text-base font-semibold text-gray-900">
                  Resumo de conformidades
                </h3>
                <p className="text-sm text-gray-500">
                  Ajuste o status inicial dos principais indicadores de conformidade do contrato.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(formState.resumoConformidades) as Array<keyof ContractMock['resumoConformidades']>).map(
                  (chave) => (
                    <label key={chave} className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                      {chave}
                      <select
                        value={formState.resumoConformidades[chave]}
                        onChange={handleResumoChange(chave)}
                        className={baseInputClasses}
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

          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-yn-orange hover:text-yn-orange"
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
    </div>
  );
}
