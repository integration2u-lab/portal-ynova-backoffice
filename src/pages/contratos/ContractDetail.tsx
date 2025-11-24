import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PencilLine, Loader2 } from 'lucide-react';
import type {
  ContractDetails as ContractMock,
  StatusResumo,
  AnaliseStatus,
} from '../../types/contracts';
import { obrigacaoColunas, formatMesLabel } from '../../types/contracts';
import PricePeriodsModal, { PricePeriods, summarizePricePeriods } from './PricePeriodsModal';
import { formatCurrencyBRL } from '../../utils/currency';
import { useContracts } from './ContractsContext';
import { parseContractPricePeriods } from '../../utils/contractPricing';
import type { VolumeUnit } from '../../types/pricePeriods';

const statusStyles: Record<StatusResumo, string> = {
  Conforme: 'bg-green-100 text-green-700 border border-green-200',
  'Divergente': 'bg-red-100 text-red-700 border border-red-200',
  'Em análise': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
};

const analiseStyles: Record<AnaliseStatus, string> = {
  verde: 'bg-green-500',
  amarelo: 'bg-yellow-400',
  vermelho: 'bg-red-500',
};

const variationColors: Record<'up' | 'down' | 'neutral', string> = {
  up: 'text-emerald-600',
  down: 'text-red-600',
  neutral: 'text-gray-500',
};

const variationSymbol: Record<'up' | 'down' | 'neutral', string> = {
  up: '▲',
  down: '▼',
  neutral: '■',
};

function formatMonth(periodo: string) {
  return formatMesLabel(periodo).replace('.', '');
}

type Props = {
  contrato: ContractMock;
  onUpdatePricePeriods?: (periods: PricePeriods) => Promise<void>;
};

// Componente de card editável reutilizável
type EditableFieldCardProps = {
  label: string;
  value: string;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onInputChange: (value: string) => void;
  inputValue: string;
  inputRef?: React.RefObject<HTMLInputElement | HTMLSelectElement | null>;
  inputType?: 'text' | 'number' | 'select';
  selectOptions?: Array<{ value: string; label: string }>;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
};

const EditableFieldCard: React.FC<EditableFieldCardProps> = ({
  label,
  value,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  onInputChange,
  inputValue,
  inputRef,
  inputType = 'text',
  selectOptions,
  onKeyDown,
  placeholder,
  error = false,
  disabled = false,
}) => {
  const displayValue = value || 'Não informado';
  const cardBorderColor = error ? 'border-red-300' : 'border-gray-100';
  const textColor = error ? 'text-red-600' : 'text-gray-900';

  return (
    <div className={`rounded-lg border ${cardBorderColor} bg-gray-50 p-4`}>
      <div className="flex items-center justify-between">
        <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</dt>
        {!isEditing && (
          <button
            type="button"
            onClick={onEdit}
            disabled={disabled || isSaving}
            className="rounded-lg border border-gray-300 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Editar
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="mt-3 flex items-center gap-2">
          {inputType === 'select' ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={isSaving || disabled}
              className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-sm font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
            >
              {selectOptions?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={inputType}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={isSaving || disabled}
              className="flex-1 rounded-lg border-2 border-yn-orange bg-white px-3 py-2 text-sm font-bold text-gray-900 shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 disabled:opacity-50"
              placeholder={placeholder}
            />
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || disabled}
            className="rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yn-orange/90 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : '✓'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving || disabled}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      ) : (
        <dd className={`mt-1 text-sm font-bold ${textColor}`}>{displayValue}</dd>
      )}
    </div>
  );
};

export function StatusBadge({ status }: { status: StatusResumo }) {
  return (
    <span className={`inline-flex items-center max-w-full break-words whitespace-normal sm:whitespace-nowrap px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

const normalizeVolumeUnit = (value: unknown): VolumeUnit | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'MW_MEDIO' || normalized === 'MW MÉDIO' || normalized === 'MW MEDIO') {
    return 'MW_MEDIO';
  }
  if (normalized === 'MWH') {
    return 'MWH';
  }
  return undefined;
};

const toPricePeriods = (rawValue: string | null | undefined): PricePeriods | null => {
  const parsed = parseContractPricePeriods(rawValue ?? undefined);
  
  if (!parsed || !Array.isArray(parsed.periods)) {
    return null;
  }

  const normalizedPeriods: PricePeriods['periods'] = [];

  parsed.periods.forEach((period, index) => {
    const months = period.months
      .filter(
        (month): month is {
          ym: string;
          price?: number;
          volume?: number | null;
          volumeUnit?: VolumeUnit | null;
          hoursInMonth?: number;
          volumeMWm?: number | null;
          volumeMWh?: number | null;
          volumeSeasonalizedMWh?: number | null;
          flexibilityMaxMWh?: number | null;
          flexibilityMinMWh?: number | null;
          basePrice?: number | null;
          adjustedPrice?: number | null;
        } => {
          // Aceita meses que tenham price, basePrice ou volumeMWm
          const hasPrice = typeof month.price === 'number' && Number.isFinite(month.price);
          const hasBasePrice = typeof month.basePrice === 'number' && Number.isFinite(month.basePrice);
          const hasVolumeMWm = typeof month.volumeMWm === 'number' && Number.isFinite(month.volumeMWm);
          
          return hasPrice || hasBasePrice || hasVolumeMWm;
        }
      )
      .map((month) => ({
        ym: month.ym,
        price: month.price,
        volume: typeof month.volume === 'number' && Number.isFinite(month.volume) ? month.volume : null,
        volumeUnit: normalizeVolumeUnit(month.volumeUnit),
        // Carrega todos os novos campos salvos no JSON
        hoursInMonth: typeof month.hoursInMonth === 'number' ? month.hoursInMonth : undefined,
        volumeMWm: typeof month.volumeMWm === 'number' && Number.isFinite(month.volumeMWm) ? month.volumeMWm : null,
        volumeMWh: typeof month.volumeMWh === 'number' && Number.isFinite(month.volumeMWh) ? month.volumeMWh : null,
        volumeSeasonalizedMWh: typeof month.volumeSeasonalizedMWh === 'number' && Number.isFinite(month.volumeSeasonalizedMWh) ? month.volumeSeasonalizedMWh : null,
        flexibilityMaxMWh: typeof month.flexibilityMaxMWh === 'number' && Number.isFinite(month.flexibilityMaxMWh) ? month.flexibilityMaxMWh : null,
        flexibilityMinMWh: typeof month.flexibilityMinMWh === 'number' && Number.isFinite(month.flexibilityMinMWh) ? month.flexibilityMinMWh : null,
        basePrice: typeof month.basePrice === 'number' && Number.isFinite(month.basePrice) ? month.basePrice : null,
        // adjustedPrice não é carregado - será recalculado pelo modal
      }));

    const hasDefaultPrice = typeof period.defaultPrice === 'number' && Number.isFinite(period.defaultPrice);
    const defaultPriceValue = hasDefaultPrice ? (period.defaultPrice as number) : undefined;

    if (!months.length && !hasDefaultPrice) {
      return;
    }

    normalizedPeriods.push({
      id: period.id || `period-${index + 1}`,
      start: period.start,
      end: period.end,
      defaultPrice: defaultPriceValue,
      defaultVolume: typeof period.defaultVolume === 'number' ? period.defaultVolume : null,
      defaultVolumeUnit: normalizeVolumeUnit(period.defaultVolumeUnit) ?? null,
      months,
    });
  });

  if (!normalizedPeriods.length) {
    return null;
  }

  return { periods: normalizedPeriods } satisfies PricePeriods;
};

export const ContractDetail: React.FC<Props> = ({ contrato: contratoOriginal, onUpdatePricePeriods }) => {
  const { updateContract } = useContracts();
  const [isPriceModalOpen, setIsPriceModalOpen] = React.useState(false);
  const [isEditingFlatPrice, setIsEditingFlatPrice] = React.useState(false);
  const [isSavingFlatPrice, setIsSavingFlatPrice] = React.useState(false);
  const [flatPriceInputValue, setFlatPriceInputValue] = React.useState('');
  
  // Estado para edição de campos
  const [editingField, setEditingField] = React.useState<string | null>(null);
  const [fieldInputValue, setFieldInputValue] = React.useState('');
  const [savingField, setSavingField] = React.useState<string | null>(null);
  const fieldInputRef = React.useRef<HTMLInputElement | HTMLSelectElement>(null);
  
  // Migra campos antigos para campos separados
  const contrato = React.useMemo(() => {
    const updated = { ...contratoOriginal };
    
    console.log('🔍 [ContractDetail] Contrato recebido:', {
      id: updated.id,
      codigo: updated.codigo,
      flexSazonalSuperior: updated.flexSazonalSuperior,
      flexSazonalInferior: updated.flexSazonalInferior,
      flex: updated.flex,
      limiteSuperior: updated.limiteSuperior,
      limiteInferior: updated.limiteInferior,
    });
    
    // Verifica se tem campos antigos mas não tem os novos
    const hasFlexLimites = updated.dadosContrato.some(f => f.label.toLowerCase().includes('flex / limites'));
    const hasFlexSeparated = updated.dadosContrato.some(f => f.label.toLowerCase().includes('flexibilidade (%)'));
    
    if (hasFlexLimites && !hasFlexSeparated) {
      // Remove campos antigos
      updated.dadosContrato = updated.dadosContrato.filter(f => {
        const label = f.label.toLowerCase();
        return !label.includes('flex / limites') && !label.includes('flex sazonalidade');
      });
      
      // Adiciona campos novos separados
      const flexValue = updated.flex?.replace('%', '') || '0';
      const limiteSupValue = updated.limiteSuperior?.replace('%', '') || '0';
      const limiteInfValue = updated.limiteInferior?.replace('%', '') || '0';
      const flexSazSupValue = updated.flexSazonalSuperior?.replace('%', '') || '';
      const flexSazInfValue = updated.flexSazonalInferior?.replace('%', '') || '';
      
      console.log('🔍 [ContractDetail] Valores extraídos para campos:', {
        flexValue,
        limiteSupValue,
        limiteInfValue,
        flexSazSupValue,
        flexSazInfValue,
      });
      
      // Encontra índice onde inserir (após medidor)
      const medidorIndex = updated.dadosContrato.findIndex(f => f.label.toLowerCase().includes('medidor'));
      const insertIndex = medidorIndex >= 0 ? medidorIndex + 1 : updated.dadosContrato.length;
      
      const newFields = [
        { label: 'Flexibilidade (%)', value: `${flexValue}%` },
        { label: 'Limite Superior (%)', value: `${limiteSupValue}%` },
        { label: 'Limite Inferior (%)', value: `${limiteInfValue}%` },
        { label: 'Flexibilidade Sazonalidade - Superior (%)', value: flexSazSupValue ? `${flexSazSupValue}%` : 'Não informado' },
        { label: 'Flexibilidade Sazonalidade - Inferior (%)', value: flexSazInfValue ? `${flexSazInfValue}%` : 'Não informado' },
      ];
      
      updated.dadosContrato.splice(insertIndex, 0, ...newFields);
    }
    
    return updated;
  }, [contratoOriginal]);
  
  // Função auxiliar para extrair periodPrice do contrato
  const extractPeriodPrice = React.useCallback(() => {
    // Tenta extrair de diferentes lugares possíveis
    const contractWithPeriodPrice = contrato as { 
      periodPrice?: { price_periods?: string | null; flat_price_mwh?: number | null; flat_years?: number | null };
      price_periods?: string | null;
      flat_price_mwh?: number | null;
      flat_years?: number | null;
    };
    
    const periodPrice = contractWithPeriodPrice?.periodPrice;
    const directPricePeriods = contractWithPeriodPrice?.price_periods;
    const directFlatPrice = contractWithPeriodPrice?.flat_price_mwh;
    const directFlatYears = contractWithPeriodPrice?.flat_years;
    
    // Prioriza periodPrice, mas também aceita campos diretos
    const pricePeriodsJson = periodPrice?.price_periods ?? directPricePeriods;
    const flatPrice = periodPrice?.flat_price_mwh ?? directFlatPrice;
    const flatYears = periodPrice?.flat_years ?? directFlatYears;
    
    return { pricePeriodsJson, flatPrice, flatYears };
  }, [contrato]);
  
  const [pricePeriods, setPricePeriods] = React.useState<PricePeriods | null>(() => {
    const { pricePeriodsJson } = extractPeriodPrice();
    const parsed = toPricePeriods(pricePeriodsJson);
    return parsed;
  });

  // Atualiza quando o contrato mudar
  React.useEffect(() => {
    const { pricePeriodsJson } = extractPeriodPrice();
    const parsed = toPricePeriods(pricePeriodsJson);
    setPricePeriods(parsed);
  }, [contrato, extractPeriodPrice]);

  const handlePricePeriodsSave = React.useCallback(
    async (periods: PricePeriods) => {
      if (onUpdatePricePeriods) {
        await onUpdatePricePeriods(periods);
        setPricePeriods(periods);
      }
      setIsPriceModalOpen(false);
    },
    [onUpdatePricePeriods]
  );

  const { flatPrice, flatYears } = extractPeriodPrice();
  const priceSummary = pricePeriods ? summarizePricePeriods(pricePeriods) : null;
  const periods: PricePeriods['periods'] =
    pricePeriods && Array.isArray(pricePeriods.periods)
      ? pricePeriods.periods
      : ([] as PricePeriods['periods']);

  // Função para iniciar edição de um campo
  const handleStartEditing = (fieldLabel: string, currentValue: string) => {
    setEditingField(fieldLabel);
    // Se o valor for "Não informado", usa string vazia para os selects
    const valueToEdit = currentValue === 'Não informado' ? '' : currentValue;
    setFieldInputValue(valueToEdit);
    setTimeout(() => {
      fieldInputRef.current?.focus();
    }, 0);
  };

  const normalizeLabel = (label: string) =>
    label
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();

  const handleStartEditingFlatPrice = () => {
    const formattedValue =
      typeof flatPrice === 'number' && Number.isFinite(flatPrice)
        ? flatPrice.toString().replace('.', ',')
        : '';
    setFlatPriceInputValue(formattedValue);
    setIsEditingFlatPrice(true);
  };

  const handleCancelEditingFlatPrice = () => {
    setIsEditingFlatPrice(false);
    setFlatPriceInputValue('');
  };

  const handleSaveFlatPrice = async () => {
    if (!contrato || isSavingFlatPrice) return;

    const numericValueRaw = flatPriceInputValue.replace(/[^0-9,.-]/g, '').replace(/\.(?=.*\.)/g, '');
    const normalizedValue = numericValueRaw.replace(/\./g, '').replace(',', '.');
    const priceNum = Number(normalizedValue);

    if (!Number.isFinite(priceNum) || priceNum < 0) {
      alert('Informe um preço flat válido.');
      return;
    }

    setIsSavingFlatPrice(true);
    try {
      await updateContract(contrato.id, (current) => {
        const updated = { ...current };

        const existingPeriodPrice = (updated as {
          periodPrice?: { price_periods: string | null; flat_price_mwh: number | null; flat_years: number | null };
        }).periodPrice;

        (updated as {
          periodPrice?: { price_periods: string | null; flat_price_mwh: number | null; flat_years: number | null };
        }).periodPrice = {
          price_periods: existingPeriodPrice?.price_periods ?? null,
          flat_price_mwh: priceNum,
          flat_years: existingPeriodPrice?.flat_years ?? null,
        };

        (updated as { flatPrice?: number | null }).flatPrice = priceNum;

        const formattedDisplay = formatCurrencyBRL(priceNum);
        const flatLabelIndex = updated.dadosContrato.findIndex((field) => {
          const normalized = normalizeLabel(field.label);
          return normalized.includes('preco') && normalized.includes('flat');
        });

        if (flatLabelIndex >= 0) {
          updated.dadosContrato[flatLabelIndex] = {
            ...updated.dadosContrato[flatLabelIndex],
            value: formattedDisplay,
          };
        } else {
          updated.dadosContrato = [
            ...updated.dadosContrato,
            { label: 'Preço Flat', value: formattedDisplay },
          ];
        }

        return updated;
      });

      setIsEditingFlatPrice(false);
      setFlatPriceInputValue('');
    } catch (error) {
      console.error('[ContractDetail] Falha ao salvar preço flat:', error);
      alert('Não foi possível salvar o preço flat. Tente novamente.');
    } finally {
      setIsSavingFlatPrice(false);
    }
  };

  // Função para cancelar edição
  const handleCancelEditing = () => {
    setEditingField(null);
    setFieldInputValue('');
  };

  // Função para salvar um campo individual
  const handleSaveField = async (fieldLabel: string, fieldIndex: number) => {
    if (!contrato || savingField) return;

    setSavingField(fieldLabel);
    try {
      // Atualiza o campo no dadosContrato
      await updateContract(contrato.id, (current) => {
        const updated = { ...current };
        
        // Mapeia campos específicos para atualizar também no contrato
        const normalizedLabel = normalizeLabel(fieldLabel);
        
        console.log('🔍 [ContractDetail] Salvando campo:', {
          fieldLabel,
          normalizedLabel,
          fieldIndex,
          fieldInputValue,
          campoNoIndex: updated.dadosContrato[fieldIndex]?.label,
        });
        
        // Verifica se o fieldIndex corresponde ao campo correto
        const campoNoIndex = updated.dadosContrato[fieldIndex];
        if (!campoNoIndex || normalizeLabel(campoNoIndex.label) !== normalizedLabel) {
          console.error('⚠️ [ContractDetail] ERRO: fieldIndex não corresponde ao campo!', {
            fieldIndex,
            campoEsperado: fieldLabel,
            campoNoIndex: campoNoIndex?.label,
          });
        }
        
        // ORDEM IMPORTANTE: Verificações mais específicas primeiro
        // Verifica se é Flexibilidade Sazonalidade - Superior
        if (normalizedLabel.includes('flexibilidade') && normalizedLabel.includes('sazonalidade') && normalizedLabel.includes('superior') && !normalizedLabel.includes('inferior')) {
          // Flexibilidade Sazonalidade - Superior - APENAS ESTE CAMPO
          const numericValue = fieldInputValue.replace(/[^\d.,]/g, '').replace(',', '.');
          const parsed = parseFloat(numericValue);
          console.log('✅ [ContractDetail] Salvando APENAS flexibilidade sazonal SUPERIOR:', {
            fieldLabel,
            normalizedLabel,
            fieldIndex,
            fieldInputValue,
            numericValue,
            parsed,
            isFinite: Number.isFinite(parsed),
            campoNoIndex: updated.dadosContrato[fieldIndex]?.label,
          });
          
          // Atualiza APENAS o campo correto
          if (Number.isFinite(parsed)) {
            updated.flexSazonalSuperior = `${parsed}%`;
            // Atualiza APENAS o campo no índice correto
            if (updated.dadosContrato[fieldIndex] && normalizeLabel(updated.dadosContrato[fieldIndex].label) === normalizedLabel) {
              updated.dadosContrato[fieldIndex].value = `${parsed}%`;
            } else {
              // Se o índice não corresponder, procura o campo correto
              const correctIndex = updated.dadosContrato.findIndex(f => 
                normalizeLabel(f.label) === normalizedLabel
              );
              if (correctIndex >= 0) {
                updated.dadosContrato[correctIndex].value = `${parsed}%`;
                console.log('🔧 [ContractDetail] Campo encontrado no índice correto:', correctIndex);
              } else {
                console.error('❌ [ContractDetail] Campo não encontrado no dadosContrato!');
              }
            }
          } else {
            updated.flexSazonalSuperior = null;
            if (updated.dadosContrato[fieldIndex] && normalizeLabel(updated.dadosContrato[fieldIndex].label) === normalizedLabel) {
              updated.dadosContrato[fieldIndex].value = 'Não informado';
            }
          }
          // IMPORTANTE: Retorna aqui para não processar outras condições
          return updated;
        } else if (normalizedLabel.includes('flexibilidade') && normalizedLabel.includes('sazonalidade') && normalizedLabel.includes('inferior') && !normalizedLabel.includes('superior')) {
          // Flexibilidade Sazonalidade - Inferior - APENAS ESTE CAMPO
          const numericValue = fieldInputValue.replace(/[^\d.,]/g, '').replace(',', '.');
          const parsed = parseFloat(numericValue);
          console.log('✅ [ContractDetail] Salvando APENAS flexibilidade sazonal INFERIOR:', {
            fieldLabel,
            normalizedLabel,
            fieldIndex,
            fieldInputValue,
            numericValue,
            parsed,
            isFinite: Number.isFinite(parsed),
            campoNoIndex: updated.dadosContrato[fieldIndex]?.label,
          });
          
          // Atualiza APENAS o campo correto
          if (Number.isFinite(parsed)) {
            updated.flexSazonalInferior = `${parsed}%`;
            // Atualiza APENAS o campo no índice correto
            if (updated.dadosContrato[fieldIndex] && normalizeLabel(updated.dadosContrato[fieldIndex].label) === normalizedLabel) {
              updated.dadosContrato[fieldIndex].value = `${parsed}%`;
            } else {
              // Se o índice não corresponder, procura o campo correto
              const correctIndex = updated.dadosContrato.findIndex(f => 
                normalizeLabel(f.label) === normalizedLabel
              );
              if (correctIndex >= 0) {
                updated.dadosContrato[correctIndex].value = `${parsed}%`;
                console.log('🔧 [ContractDetail] Campo encontrado no índice correto:', correctIndex);
              } else {
                console.error('❌ [ContractDetail] Campo não encontrado no dadosContrato!');
              }
            }
          } else {
            updated.flexSazonalInferior = null;
            if (updated.dadosContrato[fieldIndex] && normalizeLabel(updated.dadosContrato[fieldIndex].label) === normalizedLabel) {
              updated.dadosContrato[fieldIndex].value = 'Não informado';
            }
          }
          // IMPORTANTE: Retorna aqui para não processar outras condições
          return updated;
        } else if (normalizedLabel.includes('flexibilidade') && normalizedLabel.includes('%') && !normalizedLabel.includes('sazonalidade')) {
          // Flexibilidade (%) - mas não sazonalidade
          const numericValue = fieldInputValue.replace(/[^\d.,]/g, '').replace(',', '.');
          const parsed = parseFloat(numericValue);
          if (Number.isFinite(parsed)) {
            updated.flex = `${parsed}%`;
            updated.dadosContrato[fieldIndex].value = `${parsed}%`;
          }
        } else if (normalizedLabel.includes('volume') && normalizedLabel.includes('contratado')) {
          // Volume contratado - verificação mais específica
          const volumeNum = parseFloat(fieldInputValue.replace(/[^\d.,]/g, '').replace(',', '.'));
          console.log('🔍 [ContractDetail] Salvando volume contratado:', {
            fieldInputValue,
            volumeNum,
            isFinite: Number.isFinite(volumeNum),
          });
          if (Number.isFinite(volumeNum)) {
            (updated as { contractedVolume?: number }).contractedVolume = volumeNum;
          }
        } else if (normalizedLabel.includes('preco') && normalizedLabel.includes('flat')) {
          const priceNum = parseFloat(fieldInputValue.replace(/[^\d.,]/g, '').replace(',', '.'));
          if (Number.isFinite(priceNum)) {
            const existingPeriodPrice = (updated as {
              periodPrice?: { price_periods: string | null; flat_price_mwh: number | null; flat_years: number | null };
            }).periodPrice;
            (updated as {
              periodPrice?: { price_periods: string | null; flat_price_mwh: number | null; flat_years: number | null };
            }).periodPrice = {
              price_periods: existingPeriodPrice?.price_periods ?? null,
              flat_price_mwh: priceNum,
              flat_years: existingPeriodPrice?.flat_years ?? null,
            };
            (updated as { flatPrice?: number | null }).flatPrice = priceNum;
            updated.dadosContrato[fieldIndex].value = formatCurrencyBRL(priceNum);
          } else {
            updated.dadosContrato[fieldIndex].value = fieldInputValue.trim();
          }
        } else if (normalizedLabel.includes('preco') && normalizedLabel.includes('mwh')) {
          const priceNum = parseFloat(fieldInputValue.replace(/[^\d.,]/g, '').replace(',', '.'));
          if (Number.isFinite(priceNum)) {
            updated.precoMedio = priceNum;
            const existingPeriodPrice = (updated as { periodPrice?: { price_periods: string | null; flat_price_mwh: number | null; flat_years: number | null } }).periodPrice;
            (updated as { periodPrice?: { price_periods: string | null; flat_price_mwh: number | null; flat_years: number | null } }).periodPrice = {
              price_periods: existingPeriodPrice?.price_periods ?? null,
              flat_price_mwh: priceNum,
              flat_years: existingPeriodPrice?.flat_years ?? null,
            };
            (updated as { flatPrice?: number | null }).flatPrice = priceNum;
          }
        } else if (normalizedLabel.includes('limite superior')) {
          // Limite Superior (%)
          const numericValue = fieldInputValue.replace(/[^\d.,]/g, '').replace(',', '.');
          const parsed = parseFloat(numericValue);
          if (Number.isFinite(parsed)) {
            updated.limiteSuperior = `${parsed}%`;
            updated.dadosContrato[fieldIndex].value = `${parsed}%`;
          }
        } else if (normalizedLabel.includes('limite inferior')) {
          // Limite Inferior (%)
          const numericValue = fieldInputValue.replace(/[^\d.,]/g, '').replace(',', '.');
          const parsed = parseFloat(numericValue);
          if (Number.isFinite(parsed)) {
            updated.limiteInferior = `${parsed}%`;
            updated.dadosContrato[fieldIndex].value = `${parsed}%`;
          }
        } else if (normalizedLabel.includes('submercado')) {
          updated.submercado = fieldInputValue.trim();
          if (updated.dadosContrato[fieldIndex]) {
            updated.dadosContrato[fieldIndex].value = fieldInputValue.trim();
          }
        } else if (normalizedLabel.includes('fornecedor')) {
          updated.fornecedor = fieldInputValue.trim();
          if (updated.dadosContrato[fieldIndex]) {
            updated.dadosContrato[fieldIndex].value = fieldInputValue.trim();
          }
        } else if (normalizedLabel.includes('status')) {
          updated.status = fieldInputValue as ContractMock['status'];
          if (updated.dadosContrato[fieldIndex]) {
            updated.dadosContrato[fieldIndex].value = fieldInputValue.trim();
          }
        } else if (normalizedLabel.includes('proinfa')) {
          const proinfaNum = parseFloat(fieldInputValue.replace(/[^\d.,]/g, '').replace(',', '.'));
          (updated as { proinfa?: number | null }).proinfa = Number.isFinite(proinfaNum) ? proinfaNum : null;
          if (updated.dadosContrato[fieldIndex]) {
            updated.dadosContrato[fieldIndex].value = fieldInputValue.trim();
          }
        } else if (normalizedLabel.includes('balanco')) {
          (updated as { balanceEmail?: string }).balanceEmail = fieldInputValue.trim();
          if (updated.dadosContrato[fieldIndex]) {
            updated.dadosContrato[fieldIndex].value = fieldInputValue.trim();
          }
        } else if (normalizedLabel.includes('faturamento')) {
          (updated as { billingEmail?: string }).billingEmail = fieldInputValue.trim();
          if (updated.dadosContrato[fieldIndex]) {
            updated.dadosContrato[fieldIndex].value = fieldInputValue.trim();
          }
        } else if (normalizedLabel.includes('email')) {
          (updated as { balanceEmail?: string }).balanceEmail = fieldInputValue.trim();
          if (updated.dadosContrato[fieldIndex]) {
            updated.dadosContrato[fieldIndex].value = fieldInputValue.trim();
          }
        } else if (normalizedLabel.includes('responsável')) {
          updated.contato = fieldInputValue.trim();
          if (updated.dadosContrato[fieldIndex]) {
            updated.dadosContrato[fieldIndex].value = fieldInputValue.trim();
          }
        } else if (normalizedLabel.includes('segmento')) {
          updated.segmento = fieldInputValue.trim();
          if (updated.dadosContrato[fieldIndex]) {
            updated.dadosContrato[fieldIndex].value = fieldInputValue.trim();
          }
        } else if (normalizedLabel.includes('modalidade')) {
          updated.modalidade = fieldInputValue.trim();
          if (updated.dadosContrato[fieldIndex]) {
            updated.dadosContrato[fieldIndex].value = fieldInputValue.trim();
          }
        } else if (normalizedLabel.includes('fonte')) {
          updated.fonte = fieldInputValue.trim() as ContractMock['fonte'];
          if (updated.dadosContrato[fieldIndex]) {
            updated.dadosContrato[fieldIndex].value = fieldInputValue.trim();
          }
        } else {
          // Campo não reconhecido - apenas atualiza o valor no dadosContrato
          console.warn('⚠️ [ContractDetail] Campo não reconhecido, atualizando apenas dadosContrato:', {
            fieldLabel,
            normalizedLabel,
          });
          if (updated.dadosContrato[fieldIndex]) {
            updated.dadosContrato[fieldIndex].value = fieldInputValue.trim();
          }
        }
        
        return updated;
      });

      setEditingField(null);
      setFieldInputValue('');
    } catch (error) {
      console.error(`[ContractDetail] Falha ao salvar campo ${fieldLabel}:`, error);
      alert(`Erro ao salvar ${fieldLabel}. Tente novamente.`);
    } finally {
      setSavingField(null);
    }
  };

  // Função para lidar com tecla Enter/ESC
  const handleKeyDown = (e: React.KeyboardEvent, fieldLabel: string, fieldIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveField(fieldLabel, fieldIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEditing();
    }
  };

  // Opções para campos select
  const statusOptions = [
    { value: 'Ativo', label: 'Ativo' },
    { value: 'Inativo', label: 'Inativo' },
    { value: 'Vigente', label: 'Vigente' },
    { value: 'Encerrado', label: 'Encerrado' },
  ];

  const fonteOptions = [
    { value: 'Incentivada 0%', label: 'Incentivada 0%' },
    { value: 'Incentivada 50%', label: 'Incentivada 50%' },
    { value: 'Incentivada 100%', label: 'Incentivada 100%' },
    { value: 'Convencional', label: 'Convencional' },
  ];

  const submarketOptions = [
    { value: '', label: 'Selecione um submercado' },
    { value: 'Norte', label: 'Norte' },
    { value: 'Nordeste', label: 'Nordeste' },
    { value: 'Sudeste/Centro-Oeste', label: 'Sudeste/Centro-Oeste' },
    { value: 'Sul', label: 'Sul' },
  ];

  const fornecedorOptions = [
    { value: '', label: 'Selecione um fornecedor' },
    { value: 'Boven', label: 'Boven' },
    { value: 'Serena', label: 'Serena' },
    { value: 'Bolt', label: 'Bolt' },
    { value: 'Matrix', label: 'Matrix' },
    { value: 'Voltta', label: 'Voltta' },
    { value: 'Newave', label: 'Newave' },
    { value: 'Auren', label: 'Auren' },
  ];

  return (
    <div className="space-y-6">
      <section aria-labelledby="indicadores" className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 id="indicadores" className="text-base font-semibold text-gray-900">
            Indicadores / KPIs
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {contrato.kpis.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm shadow-sm transition hover:border-yn-orange/60 hover:shadow"
            >
              <div className="font-bold text-gray-500">{item.label}</div>
              <div className="mt-2 text-lg font-bold text-gray-900">{item.value}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                {item.helper && <span>{item.helper}</span>}
                {item.variation && (
                  <span className={`font-semibold ${variationColors[item.variation.direction]}`}>
                    {variationSymbol[item.variation.direction]} {item.variation.value}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="dados-contrato" className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h2 id="dados-contrato" className="text-base font-semibold text-gray-900">
            Dados do Contrato
          </h2>
          <span className="rounded-full bg-yn-orange/10 px-3 py-1 text-xs font-semibold text-yn-orange">Editável</span>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {contrato.dadosContrato.map((field, index) => {
            const normalizedLabel = field.label.toLowerCase();
            const normalizedLabelWithoutDiacritics = normalizedLabel
              .normalize('NFD')
              .replace(/\p{Diacritic}/gu, '');
            const isEditing = editingField === field.label;
            const isSaving = savingField === field.label;
            
            const hiddenLabelFragments = [
              'proinfa',
              'preço spot referência',
              'preco spot referencia',
              'conformidade consumo',
              'conformidade nf',
              'conformidade fatura',
              'conformidade encargos',
              'conformidade geral',
              'ciclo de faturamento',
              'ciclo faturamento',
            ];

            if (
              hiddenLabelFragments.some(
                (fragment) =>
                  normalizedLabel.includes(fragment) ||
                  normalizedLabelWithoutDiacritics.includes(fragment)
              )
            ) {
              return null;
            }

            // Determina o tipo de input baseado no label
            let inputType: 'text' | 'number' | 'select' = 'text';
            let selectOptions: Array<{ value: string; label: string }> | undefined;
            
            if (normalizedLabel.includes('status')) {
              inputType = 'select';
              selectOptions = statusOptions;
            } else if (normalizedLabel.includes('fonte')) {
              inputType = 'select';
              selectOptions = fonteOptions;
            } else if (normalizedLabel.includes('submercado')) {
              inputType = 'select';
              selectOptions = submarketOptions;
            } else if (normalizedLabel.includes('fornecedor')) {
              inputType = 'select';
              selectOptions = fornecedorOptions;
            } else if (
              normalizedLabel.includes('volume') || 
              normalizedLabel.includes('preço') || 
              normalizedLabel.includes('proinfa') || 
              normalizedLabel.includes('spot') ||
              normalizedLabel.includes('flexibilidade') ||
              normalizedLabel.includes('limite')
            ) {
              inputType = 'number';
            }
            
            // Verifica se é campo de erro (Proinfa quando 0)
            const isError = normalizedLabel.includes('proinfa') && (field.value === '0,00' || field.value === '0.00' || field.value === '0');
            
            return (
              <EditableFieldCard
                key={`${field.label}-${index}`}
                label={field.label}
                value={field.value}
                isEditing={isEditing}
                isSaving={isSaving}
                onEdit={() => handleStartEditing(field.label, field.value)}
                onSave={() => handleSaveField(field.label, index)}
                onCancel={handleCancelEditing}
                onInputChange={setFieldInputValue}
                inputValue={fieldInputValue}
                inputRef={fieldInputRef}
                inputType={inputType}
                selectOptions={selectOptions}
                onKeyDown={(e) => handleKeyDown(e, field.label, index)}
                error={isError}
              />
            );
          })}
        </dl>
      </section>

      <section aria-labelledby="precos-periodo" className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h2 id="precos-periodo" className="text-base font-semibold text-gray-900">
            Preços por Período
          </h2>
          {onUpdatePricePeriods && (
            <button
              type="button"
              onClick={() => setIsPriceModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-yn-orange px-3 py-2 text-sm font-semibold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
            >
              <PencilLine size={16} />
              Editar preços
            </button>
          )}
        </div>
        <div className="p-4">
          {periods.length > 0 ? (
            <div className="space-y-4">
              {(periods as Array<PricePeriods['periods'][number]>).map((period, index) => {
                const monthsWithPrice = period.months.filter((m) => Number.isFinite(m.price));
                const periodAverage = monthsWithPrice.length > 0
                  ? monthsWithPrice.reduce((sum, m) => sum + m.price, 0) / monthsWithPrice.length
                  : period.defaultPrice ?? 0;

                return (
                  <div key={period.id || `period-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          Período {index + 1}: {formatMesLabel(period.start)} - {formatMesLabel(period.end)}
                        </h3>
                        {period.defaultPrice && (
                          <p className="text-xs text-gray-500 mt-1">
                            Preço padrão: {formatCurrencyBRL(period.defaultPrice)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-500">Preço médio</p>
                        <p className="text-sm font-bold text-gray-900">{formatCurrencyBRL(periodAverage)}</p>
                      </div>
                    </div>
                    {monthsWithPrice.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {monthsWithPrice.map((month) => (
                          <div key={month.ym} className="rounded border border-gray-200 bg-white px-2 py-1.5 text-xs">
                            <div className="font-semibold text-gray-500">{formatMesLabel(month.ym)}</div>
                            <div className="font-bold text-gray-900">{formatCurrencyBRL(month.price)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">Nenhum preço mensal definido</p>
                    )}
                  </div>
                );
              })}
              {priceSummary && (
                <div className="mt-4 rounded-lg border border-yn-orange/30 bg-yn-orange/5 p-3">
                  <p className="text-xs font-semibold text-gray-600">
                    Resumo: {priceSummary.filledMonths} {priceSummary.filledMonths === 1 ? 'mês' : 'meses'} preenchido{priceSummary.filledMonths !== 1 ? 's' : ''} · 
                    Preço médio geral: {formatCurrencyBRL(priceSummary.averagePrice ?? 0)}
                  </p>
                </div>
              )}
            </div>
          ) : flatPrice && Number.isFinite(flatPrice) ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              {isEditingFlatPrice ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Editar preço flat</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Informe o novo valor em R$/MWh para o preço flat aplicado ao contrato.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative max-w-xs flex-1">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={flatPriceInputValue}
                        onChange={(event) => setFlatPriceInputValue(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-7 text-sm shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40"
                        placeholder="0,00"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveFlatPrice}
                        disabled={isSavingFlatPrice}
                        className="inline-flex items-center gap-2 rounded-lg bg-yn-orange px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingFlatPrice ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditingFlatPrice}
                        disabled={isSavingFlatPrice}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-gray-400 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Valor atual: <span className="font-semibold text-gray-900">{formatCurrencyBRL(flatPrice)}</span>
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Preço Flat</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {flatYears && Number.isFinite(flatYears) ? `${flatYears} ${flatYears === 1 ? 'ano' : 'anos'}` : 'Período indefinido'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-500">Preço</p>
                      <p className="text-lg font-bold text-gray-900">{formatCurrencyBRL(flatPrice)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleStartEditingFlatPrice}
                      className="inline-flex items-center gap-2 rounded-lg border border-yn-orange px-3 py-2 text-sm font-semibold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
                    >
                      <PencilLine size={16} /> Editar preço flat
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
              <p className="text-sm font-semibold text-gray-500">Nenhum preço por período configurado</p>
              {onUpdatePricePeriods && (
                <button
                  type="button"
                  onClick={() => setIsPriceModalOpen(true)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-yn-orange px-4 py-2 text-sm font-semibold text-yn-orange shadow-sm transition hover:bg-yn-orange hover:text-white"
                >
                  <PencilLine size={16} />
                  Configurar preços
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="historico" className="space-y-4">
        <h2 id="historico" className="text-base font-semibold text-gray-900">
          Histórico
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-900">Histórico de Demanda</h3>
            <p className="text-xs text-gray-500">Comparativo de demanda ponta e fora-ponta</p>
            <div className="h-60 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={contrato.historicoDemanda}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mes" tickFormatter={formatMonth} fontSize={11} stroke="#6b7280" />
                  <YAxis fontSize={11} stroke="#6b7280" />
                  <Tooltip
                    labelFormatter={(label) => formatMonth(String(label))}
                    contentStyle={{ fontSize: '0.75rem', borderRadius: '0.75rem' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Line type="monotone" dataKey="ponta" name="Ponta" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="foraPonta" name="Fora-Ponta" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-900">Histórico de Consumo</h3>
            <p className="text-xs text-gray-500">Meta vs realizado (MWh)</p>
            <div className="h-60 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={contrato.historicoConsumo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mes" tickFormatter={formatMonth} fontSize={11} stroke="#6b7280" />
                  <YAxis fontSize={11} stroke="#6b7280" />
                  <Tooltip
                    labelFormatter={(label) => formatMonth(String(label))}
                    contentStyle={{ fontSize: '0.75rem', borderRadius: '0.75rem' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Line type="monotone" dataKey="meta" name="Meta" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="realizado" name="Realizado" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="obrigacoes" className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 id="obrigacoes" className="text-base font-semibold text-gray-900">
            Obrigações &amp; Status
          </h2>
        </div>
        <div className="overflow-auto">
          <table className="min-w-[960px] w-full table-auto divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {obrigacaoColunas.map((col) => (
                  <th key={col} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {contrato.obrigacoes.map((linha) => (
                <tr key={linha.periodo} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2 text-sm font-bold text-gray-900">{linha.periodo}</td>
                  {obrigacaoColunas.slice(1).map((col) => (
                    <td key={col} className="px-3 py-2">
                      <StatusBadge status={linha.status[col]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="indicadores-analises" className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 id="indicadores-analises" className="text-base font-semibold text-gray-900">
            Indicadores de Análises
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
          {contrato.analises.map((area) => (
            <div key={area.area} className="rounded-lg border border-gray-100 bg-gray-50 p-4 shadow-sm">
              <div className="mb-3 text-sm font-bold text-gray-900">{area.area}</div>
              <ol className="space-y-2 text-xs font-bold text-gray-600">
                {area.etapas.map((etapa) => (
                  <li key={etapa.nome} className="flex items-center justify-between gap-4 rounded-md bg-white px-3 py-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${analiseStyles[etapa.status]}`} aria-hidden />
                      <span className="font-bold text-gray-800">{etapa.nome}</span>
                    </div>
                    {etapa.observacao && <span className="text-[11px] font-bold text-gray-500">{etapa.observacao}</span>}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {isPriceModalOpen && onUpdatePricePeriods && (
        <PricePeriodsModal
          open={isPriceModalOpen}
          value={pricePeriods || { periods: [] }}
          onClose={() => setIsPriceModalOpen(false)}
          onSave={handlePricePeriodsSave}
          contractStartDate={contrato.inicioVigencia}
          contractEndDate={contrato.fimVigencia}
          flexibilityUpper={contrato.flexSazonalSuperior ? parseFloat(contrato.flexSazonalSuperior.replace('%', '')) : 0}
          flexibilityLower={contrato.flexSazonalInferior ? parseFloat(contrato.flexSazonalInferior.replace('%', '')) : 0}
        />
      )}
    </div>
  );
};
