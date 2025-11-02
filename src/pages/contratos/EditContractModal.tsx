import React from 'react';
import { X, PencilLine } from 'lucide-react';
import type { ContractDetails as ContractMock, StatusResumo } from '../../types/contracts';
import { SUPPLIERS, SUPPLIER_NAMES, getSupplierEmails } from '../../utils/suppliers';
import PricePeriodsModal, { PricePeriods, summarizePricePeriods } from './PricePeriodsModal';
import { formatCurrencyBRL, formatCurrencyInputBlur, parseCurrencyInput, sanitizeCurrencyInput } from '../../utils/currency';

type EditableField = 
  | 'cliente'
  | 'razaoSocial'
  | 'cnpj'
  | 'segmento'
  | 'contato'
  | 'status'
  | 'fonte'
  | 'modalidade'
  | 'fornecedor'
  | 'inicioVigencia'
  | 'fimVigencia'
  | 'limiteSuperior'
  | 'limiteInferior'
  | 'flex'
  | 'precoMedio'
  | 'balanceEmail'
  | 'billingEmail'
  | 'medidor';

type FieldConfig = {
  key: EditableField;
  label: string;
  type: 'text' | 'email' | 'number' | 'date' | 'select' | 'select-supplier' | 'select-status';
  options?: string[];
  placeholder?: string;
};

const resumoStatusOptions: StatusResumo[] = ['Conforme', 'Em análise', 'Divergente'];

// Status options for contract editing (same as CreateContractModal)
const contractStatusOptions = [
  { value: 'Ativo', label: 'Contrato Vigente' },
  { value: 'Inativo', label: 'Contrato encerrado' },
] as const;

const HOURS_IN_MONTH = 730;
const volumeUnitOptions = [
  { value: 'MWH', label: 'MWh' },
  { value: 'MW_MEDIO', label: 'MW médio' },
] as const;

type VolumeUnit = (typeof volumeUnitOptions)[number]['value'];

const FIELD_CONFIGS: FieldConfig[] = [
  { key: 'cliente', label: 'Cliente', type: 'text', placeholder: 'Nome do cliente' },
  { key: 'razaoSocial', label: 'Razão Social', type: 'text', placeholder: 'Razão social do cliente' },
  { key: 'cnpj', label: 'CNPJ', type: 'text', placeholder: '00.000.000/0000-00' },
  { key: 'segmento', label: 'Segmento', type: 'text', placeholder: 'Ex: Indústria' },
  { key: 'contato', label: 'Contato Responsável', type: 'text', placeholder: 'Nome completo' },
  { key: 'status', label: 'Status', type: 'select-status' },
  { key: 'fonte', label: 'Fonte de Energia', type: 'select', options: ['Incentivada 0%', 'Incentivada 50%', 'Incentivada 100%'] },
  { key: 'modalidade', label: 'Modalidade', type: 'text', placeholder: 'Ex: Preço Fixo' },
  { key: 'fornecedor', label: 'Fornecedor', type: 'select-supplier' },
  { key: 'inicioVigencia', label: 'Início da Vigência', type: 'date' },
  { key: 'fimVigencia', label: 'Fim da Vigência', type: 'date' },
  { key: 'limiteSuperior', label: 'Limite Superior (%)', type: 'number', placeholder: '200' },
  { key: 'limiteInferior', label: 'Limite Inferior (%)', type: 'number', placeholder: '0' },
  { key: 'flex', label: 'Flexibilidade (%)', type: 'number', placeholder: '100' },
  { key: 'precoMedio', label: 'Preço Médio (R$/MWh)', type: 'number', placeholder: '0,00' },
  { key: 'balanceEmail', label: 'E-mail do Balanço', type: 'email', placeholder: 'balanco@exemplo.com' },
  { key: 'billingEmail', label: 'E-mail de Faturamento', type: 'email', placeholder: 'faturamento@exemplo.com' },
  { key: 'medidor', label: 'Medidor', type: 'text', placeholder: 'Nome do medidor / grupo' },
];

type EditContractModalProps = {
  open: boolean;
  contract: ContractMock;
  onClose: () => void;
  onSave: (contractId: string, updates: Partial<ContractMock>) => Promise<void>;
};

export default function EditContractModal({ open, contract, onClose, onSave }: EditContractModalProps) {
  const [fieldValues, setFieldValues] = React.useState<Partial<Record<EditableField, string>>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [supplierCustom, setSupplierCustom] = React.useState('');
  const [isCustomSupplier, setIsCustomSupplier] = React.useState(false);
  
  // Additional fields from CreateContractModal
  const [volume, setVolume] = React.useState('');
  const [volumeUnit, setVolumeUnit] = React.useState<VolumeUnit>('MWH');
  const [flatPrice, setFlatPrice] = React.useState('');
  const [flatYears, setFlatYears] = React.useState(1);
  const [pricePeriods, setPricePeriods] = React.useState<PricePeriods>({ periods: [] });
  const [resumoConformidades, setResumoConformidades] = React.useState<ContractMock['resumoConformidades']>({
    Consumo: 'Em análise',
    NF: 'Em análise',
    Fatura: 'Em análise',
    Encargos: 'Em análise',
    Conformidade: 'Em análise',
  });
  const [isPriceModalOpen, setIsPriceModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      // Initialize all fields with current contract values
      const initialValues: Partial<Record<EditableField, string>> = {};
      FIELD_CONFIGS.forEach((config) => {
        initialValues[config.key] = getCurrentValue(contract, config.key);
      });
      setFieldValues(initialValues);
      setError(null);
      
      // Set supplier custom state if needed
      const currentSupplier = contract.fornecedor || '';
      const isCustom = Boolean(currentSupplier && !SUPPLIER_NAMES.includes(currentSupplier));
      setIsCustomSupplier(isCustom);
      setSupplierCustom(isCustom && currentSupplier ? currentSupplier : '');
      
      // Initialize volume from dadosContrato
      const volumeField = contract.dadosContrato.find((item) => {
        const label = item.label.toLowerCase();
        return label.includes('volume') || label.includes('contratado');
      });
      if (volumeField?.value) {
        const volumeMatch = volumeField.value.match(/([\d.,]+)\s*(MWh|MW\s*médio)/i);
        if (volumeMatch) {
          const volumeNum = volumeMatch[1].replace(/\./g, '').replace(',', '.');
          setVolume(volumeNum);
          setVolumeUnit(volumeMatch[2].toLowerCase().includes('médio') ? 'MW_MEDIO' : 'MWH');
        } else {
          // Try to parse just the number
          const numMatch = volumeField.value.match(/[\d.,]+/);
          if (numMatch) {
            setVolume(numMatch[0].replace(/\./g, '').replace(',', '.'));
          }
        }
      }
      
      // Initialize flat price from dadosContrato or precoMedio
      const flatPriceField = contract.dadosContrato.find((item) => {
        const label = item.label.toLowerCase();
        return label.includes('preço flat') || label.includes('flat');
      });
      if (flatPriceField?.value) {
        const priceMatch = flatPriceField.value.match(/R\$\s*([\d.,]+)/i);
        if (priceMatch) {
          setFlatPrice(priceMatch[1].replace(/\./g, '').replace(',', '.'));
        }
      } else if (contract.precoMedio && contract.precoMedio > 0) {
        setFlatPrice(contract.precoMedio.toFixed(2).replace('.', ','));
      }
      
      // Initialize price periods from contract (if available in periodos or volumeByYear)
      // This would need to be stored separately or derived from periodos
      setPricePeriods({ periods: [] });
      
      // Initialize resumo de conformidades
      setResumoConformidades(contract.resumoConformidades || {
        Consumo: 'Em análise',
        NF: 'Em análise',
        Fatura: 'Em análise',
        Encargos: 'Em análise',
        Conformidade: 'Em análise',
      });
    }
  }, [open, contract]);

  const getCurrentValue = (contract: ContractMock, field: EditableField): string => {
    switch (field) {
      case 'cliente':
        return contract.cliente || '';
      case 'razaoSocial':
        return contract.razaoSocial || '';
      case 'cnpj':
        return contract.cnpj || '';
      case 'segmento':
        return contract.segmento || '';
      case 'contato':
        return contract.contato || '';
      case 'status':
        return contract.status || 'Ativo';
      case 'fonte':
        return contract.fonte || 'Incentivada 0%';
      case 'modalidade':
        return contract.modalidade || '';
      case 'fornecedor':
        return contract.fornecedor || '';
      case 'inicioVigencia':
        return contract.inicioVigencia || '';
      case 'fimVigencia':
        return contract.fimVigencia || '';
      case 'limiteSuperior':
        return contract.limiteSuperior?.replace('%', '') || '';
      case 'limiteInferior':
        return contract.limiteInferior?.replace('%', '') || '';
      case 'flex':
        return contract.flex?.replace('%', '') || '';
      case 'precoMedio':
        return contract.precoMedio?.toString() || '';
      case 'balanceEmail':
        return contract.balanceEmail || '';
      case 'billingEmail':
        return contract.billingEmail || '';
      case 'medidor': {
        // medidor maps to groupName in API, find it in dadosContrato
        const medidorField = contract.dadosContrato.find((item) => {
          const label = item.label.toLowerCase();
          return label.includes('medidor') || label.includes('meter') || label.includes('grupo') || label.includes('group');
        });
        return medidorField?.value || '';
      }
      default:
        return '';
    }
  };

  const handleFieldChange = (field: EditableField, value: string) => {
    setFieldValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSupplierChange = (value: string) => {
    if (value === '__CUSTOM__') {
      setIsCustomSupplier(true);
      setSupplierCustom('');
      handleFieldChange('fornecedor', '');
    } else {
      setIsCustomSupplier(false);
      handleFieldChange('fornecedor', value);
      const emails = getSupplierEmails(value);
      if (!fieldValues.billingEmail && emails.length > 0) {
        handleFieldChange('billingEmail', emails.join(', '));
      }
    }
  };

  const priceSummary = React.useMemo(() => summarizePricePeriods(pricePeriods), [pricePeriods]);

  const handleFlatPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeCurrencyInput(event.target.value);
    setFlatPrice(sanitized);
  };

  const handleFlatPriceBlur = () => {
    setFlatPrice(flatPrice ? formatCurrencyInputBlur(flatPrice) : '');
  };

  const handlePricePeriodsSave = (periods: PricePeriods) => {
    setPricePeriods(periods);
    setIsPriceModalOpen(false);
  };

  const handleResumoChange = (chave: keyof ContractMock['resumoConformidades'], valor: StatusResumo) => {
    setResumoConformidades((prev) => ({
      ...prev,
      [chave]: valor,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const updates: Partial<ContractMock> = {};
      const currentDadosContrato = contract.dadosContrato || [];
      let updatedDadosContrato = [...currentDadosContrato];

      FIELD_CONFIGS.forEach((config) => {
        const field = config.key;
        const value = fieldValues[field]?.trim() || '';
        
        switch (field) {
          case 'cliente':
            updates.cliente = value;
            break;
          case 'razaoSocial':
            updates.razaoSocial = value || undefined;
            break;
          case 'cnpj':
            updates.cnpj = value;
            break;
          case 'segmento':
            updates.segmento = value;
            break;
          case 'contato':
            updates.contato = value;
            break;
          case 'status':
            updates.status = value as ContractMock['status'];
            break;
          case 'fonte':
            updates.fonte = value as ContractMock['fonte'];
            break;
          case 'modalidade':
            updates.modalidade = value;
            break;
          case 'fornecedor':
            updates.fornecedor = isCustomSupplier ? supplierCustom.trim() : value;
            break;
          case 'inicioVigencia':
            updates.inicioVigencia = value;
            break;
          case 'fimVigencia':
            updates.fimVigencia = value;
            break;
          case 'limiteSuperior':
            updates.limiteSuperior = value ? `${value}%` : '0%';
            break;
          case 'limiteInferior':
            updates.limiteInferior = value ? `${value}%` : '0%';
            break;
          case 'flex':
            updates.flex = value ? `${value}%` : '0%';
            break;
          case 'precoMedio':
            updates.precoMedio = Number(value) || 0;
            break;
          case 'balanceEmail':
            updates.balanceEmail = value || undefined;
            break;
          case 'billingEmail':
            updates.billingEmail = value || undefined;
            break;
          case 'medidor': {
            // medidor maps to groupName in API via dadosContrato
            // Update the medidor field in dadosContrato so it's sent as groupName
            const medidorIndex = updatedDadosContrato.findIndex((item) => {
              const label = item.label.toLowerCase();
              return label.includes('medidor') || label.includes('meter') || label.includes('grupo') || label.includes('group');
            });
            
            if (medidorIndex >= 0) {
              // Update existing medidor field
              updatedDadosContrato = updatedDadosContrato.map((item, index) =>
                index === medidorIndex ? { ...item, value: value || 'Não informado' } : item
              );
            } else if (value) {
              // Add new medidor field if it doesn't exist
              updatedDadosContrato.push({ label: 'Medidor', value: value });
            }
            break;
          }
        }
      });

      // Update dadosContrato if medidor was changed
      if (fieldValues.medidor !== undefined) {
        updates.dadosContrato = updatedDadosContrato;
      }

      // Update precoMedio from flatPrice or pricePeriods
      const periodsAverage = priceSummary.averagePrice ?? 0;
      const flatAverage = parseCurrencyInput(flatPrice) ?? 0;
      const priceAverage = priceSummary.filledMonths ? periodsAverage : flatAverage;
      if (priceAverage > 0) {
        updates.precoMedio = priceAverage;
      }

      // Update resumoConformidades
      updates.resumoConformidades = resumoConformidades;

      await onSave(contract.id, updates);
      onClose();
    } catch (err) {
      console.error('[EditContractModal] Erro ao salvar:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar as alterações');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Editar Contrato · {contract.codigo}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Edite os campos desejados e faça as alterações necessárias.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900"
            aria-label="Fechar modal de edição"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Editar Informações do Contrato
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {FIELD_CONFIGS.map((config) => {
                  const value = fieldValues[config.key] || '';
                  return (
                    <label
                      key={config.key}
                      className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300"
                    >
                      {config.label}
                      {config.type === 'select-status' ? (
                        <select
                          value={value}
                          onChange={(e) => handleFieldChange(config.key, e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                        >
                          {contractStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : config.type === 'select' && config.options ? (
                        <select
                          value={value}
                          onChange={(e) => handleFieldChange(config.key, e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                        >
                          {config.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : config.type === 'select-supplier' ? (
                        <div className="space-y-2">
                          <select
                            value={isCustomSupplier ? '__CUSTOM__' : value}
                            onChange={(e) => handleSupplierChange(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                          >
                            <option value="">Selecione um fornecedor</option>
                            {SUPPLIER_NAMES.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                            <option value="__CUSTOM__">Cadastrar novo fornecedor</option>
                          </select>
                          {isCustomSupplier && (
                            <input
                              type="text"
                              value={supplierCustom}
                              onChange={(e) => setSupplierCustom(e.target.value)}
                              placeholder="Nome do novo fornecedor"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                            />
                          )}
                        </div>
                      ) : (
                        <input
                          type={config.type}
                          value={value}
                          onChange={(e) => handleFieldChange(config.key, e.target.value)}
                          placeholder={config.placeholder}
                          className="rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                        />
                      )}
                    </label>
                  );
                })}
              </div>

              {/* Volume Contratado */}
              <div className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300 md:col-span-2">
                <span>Volume contratado</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                    placeholder="0,00"
                  />
                  <select
                    value={volumeUnit}
                    onChange={(e) => setVolumeUnit(e.target.value as VolumeUnit)}
                    className="min-w-[130px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {volumeUnitOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preço Flat e Períodos */}
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
                          value={flatPrice}
                          onChange={handleFlatPriceChange}
                          onBlur={handleFlatPriceBlur}
                          placeholder="0,00"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 pl-7 text-sm shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                        />
                      </div>
                      <select 
                        value={String(flatYears)} 
                        onChange={(e) => setFlatYears(Number(e.target.value) || 1)} 
                        className="min-w-[120px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                      >
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
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {priceSummary.filledMonths ? `${priceSummary.filledMonths} meses · ${formatCurrencyBRL(priceSummary.averagePrice ?? 0)}` : 'Nenhum preço por período'}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Resumo de Conformidades */}
            <section aria-labelledby="resumo-conformidades" className="space-y-4">
              <div>
                <h3 id="resumo-conformidades" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Resumo de conformidades
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ajuste o status dos principais indicadores de conformidade do contrato.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(resumoConformidades) as Array<keyof ContractMock['resumoConformidades']>).map(
                  (chave) => (
                    <label key={chave} className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                      {chave}
                      <select
                        value={resumoConformidades[chave]}
                        onChange={(e) => handleResumoChange(chave, e.target.value as StatusResumo)}
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
          </div>
        </form>

        {isPriceModalOpen && (
          <PricePeriodsModal
            open={isPriceModalOpen}
            value={pricePeriods}
            onClose={() => setIsPriceModalOpen(false)}
            onSave={handlePricePeriodsSave}
          />
        )}

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-yn-orange hover:text-yn-orange dark:border-slate-700 dark:text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-lg bg-yn-orange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

