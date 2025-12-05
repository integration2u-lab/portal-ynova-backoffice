import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useContracts } from '../../pages/contratos/ContractsContext';
import { monthsBetween } from '../../utils/dateRange';
import { getHoursInMonth } from '../../utils/contractPricing';
import type { PricePeriods } from '../../pages/contratos/PricePeriodsModal';

type VolumeContratadoModalProps = {
  open: boolean;
  contractId: string;
  balanceMonth?: string; // YYYY-MM do mês do balanço sendo visualizado
  onClose: () => void;
  onSave?: (updatedVolumes: Record<string, number>) => void; // ym -> volume
};

type MonthVolumeRow = {
  ym: string;
  hoursInMonth: number;
  volumeSeasonalizedMWh: number | null;
};

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' });

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  if (!year || !month) return ym;
  const date = new Date(year, month - 1, 1);
  return monthFormatter.format(date);
}

/**
 * Extrai volumes sazonais do price_periods do contrato
 */
function extractVolumesFromContract(contract: {
  inicioVigencia?: string;
  fimVigencia?: string;
  periodPrice?: { price_periods?: string | null };
}): MonthVolumeRow[] {
  const startDate = contract.inicioVigencia;
  const endDate = contract.fimVigencia;
  
  if (!startDate || !endDate) {
    return [];
  }
  
  // Gera lista de meses da vigência
  const startYM = startDate.substring(0, 7);
  const endYM = endDate.substring(0, 7);
  const months = monthsBetween(startYM, endYM);
  
  // Parse price_periods para extrair volumes existentes
  const existingVolumes = new Map<string, number | null>();
  
  const pricePeriodsJson = contract.periodPrice?.price_periods;
  if (pricePeriodsJson) {
    try {
      const parsed: PricePeriods = typeof pricePeriodsJson === 'string' 
        ? JSON.parse(pricePeriodsJson) 
        : pricePeriodsJson;
      
      if (parsed?.periods) {
        parsed.periods.forEach((period) => {
          period.months?.forEach((month) => {
            if (month.ym && month.volumeSeasonalizedMWh !== undefined) {
              existingVolumes.set(month.ym, month.volumeSeasonalizedMWh);
            }
          });
        });
      }
    } catch (error) {
      console.warn('[VolumeContratadoModal] Erro ao parsear price_periods:', error);
    }
  }
  
  // Cria array de meses com volumes
  return months.map((ym) => {
    const [year, month] = ym.split('-').map(Number);
    return {
      ym,
      hoursInMonth: getHoursInMonth(year, month),
      volumeSeasonalizedMWh: existingVolumes.get(ym) ?? null,
    };
  });
}

/**
 * Atualiza os volumes no price_periods existente
 */
function updateVolumesInPricePeriods(
  existingPricePeriods: string | null | undefined,
  updatedVolumes: Record<string, number | null>,
  contractStartDate: string,
  contractEndDate: string
): string {
  let parsed: PricePeriods = { periods: [] };
  
  if (existingPricePeriods) {
    try {
      parsed = typeof existingPricePeriods === 'string' 
        ? JSON.parse(existingPricePeriods) 
        : existingPricePeriods;
    } catch (error) {
      console.warn('[VolumeContratadoModal] Erro ao parsear price_periods existente:', error);
    }
  }
  
  // Se não tem períodos, cria um período único para toda a vigência
  if (!parsed.periods || parsed.periods.length === 0) {
    const startYM = contractStartDate.substring(0, 7);
    const endYM = contractEndDate.substring(0, 7);
    const months = monthsBetween(startYM, endYM);
    
    parsed.periods = [{
      id: crypto.randomUUID(),
      start: startYM,
      end: endYM,
      months: months.map((ym) => {
        const [year, month] = ym.split('-').map(Number);
        return {
          ym,
          hoursInMonth: getHoursInMonth(year, month),
          volumeSeasonalizedMWh: updatedVolumes[ym] ?? null,
        };
      }),
    }];
  } else {
    // Atualiza volumes nos períodos existentes
    parsed.periods = parsed.periods.map((period) => ({
      ...period,
      months: period.months?.map((month) => ({
        ...month,
        volumeSeasonalizedMWh: updatedVolumes[month.ym] !== undefined 
          ? updatedVolumes[month.ym] 
          : month.volumeSeasonalizedMWh,
      })) ?? [],
    }));
    
    // Adiciona meses que não existem em nenhum período
    const existingMonths = new Set<string>();
    parsed.periods.forEach((period) => {
      period.months?.forEach((month) => {
        existingMonths.add(month.ym);
      });
    });
    
    Object.keys(updatedVolumes).forEach((ym) => {
      if (!existingMonths.has(ym)) {
        // Encontra o período que contém este mês ou adiciona ao primeiro
        const targetPeriod = parsed.periods.find((p) => ym >= p.start && ym <= p.end) || parsed.periods[0];
        if (targetPeriod) {
          const [year, month] = ym.split('-').map(Number);
          targetPeriod.months = targetPeriod.months || [];
          targetPeriod.months.push({
            ym,
            hoursInMonth: getHoursInMonth(year, month),
            volumeSeasonalizedMWh: updatedVolumes[ym],
          });
          // Ordena os meses
          targetPeriod.months.sort((a, b) => a.ym.localeCompare(b.ym));
        }
      }
    });
  }
  
  return JSON.stringify(parsed);
}

export default function VolumeContratadoModal({
  open,
  contractId,
  balanceMonth,
  onClose,
  onSave,
}: VolumeContratadoModalProps) {
  const { getContractById, updateContract } = useContracts();
  const [monthRows, setMonthRows] = React.useState<MonthVolumeRow[]>([]);
  const [editingValues, setEditingValues] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  
  const contract = React.useMemo(() => {
    if (!contractId) return null;
    return getContractById(contractId);
  }, [contractId, getContractById]);
  
  // Inicializa dados quando o modal abre
  React.useEffect(() => {
    if (open && contract) {
      const rows = extractVolumesFromContract(contract);
      setMonthRows(rows);
      setEditingValues({});
      setHasChanges(false);
    }
  }, [open, contract]);
  
  const handleVolumeChange = React.useCallback((ym: string, value: string) => {
    // Remove espaços e caracteres inválidos, mas mantém números, vírgula e ponto
    const cleaned = value.replace(/\s/g, '').replace(/[^0-9,.]/g, '');
    
    setEditingValues((prev) => ({ ...prev, [ym]: cleaned }));
    setHasChanges(true);
    
    // Converte para número e atualiza o estado
    if (!cleaned) {
      setMonthRows((prev) =>
        prev.map((row) =>
          row.ym === ym ? { ...row, volumeSeasonalizedMWh: null } : row
        )
      );
      return;
    }
    
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    
    if (!isNaN(parsed) && isFinite(parsed)) {
      setMonthRows((prev) =>
        prev.map((row) =>
          row.ym === ym ? { ...row, volumeSeasonalizedMWh: parsed } : row
        )
      );
    }
  }, []);
  
  const handleVolumeBlur = React.useCallback((ym: string) => {
    setEditingValues((prev) => {
      const updated = { ...prev };
      delete updated[ym];
      return updated;
    });
  }, []);
  
  const handleSave = React.useCallback(async () => {
    if (!contract || isSaving) return;
    
    setIsSaving(true);
    try {
      // Prepara os volumes atualizados
      const updatedVolumes: Record<string, number | null> = {};
      monthRows.forEach((row) => {
        updatedVolumes[row.ym] = row.volumeSeasonalizedMWh;
      });
      
      // Atualiza o price_periods do contrato
      const updatedPricePeriods = updateVolumesInPricePeriods(
        contract.periodPrice?.price_periods,
        updatedVolumes,
        contract.inicioVigencia || '',
        contract.fimVigencia || ''
      );
      
      console.log('[VolumeContratadoModal] 📦 Salvando volumes:', {
        contractId: contract.id,
        updatedVolumes,
        updatedPricePeriodsLength: updatedPricePeriods?.length,
        updatedPricePeriodsPreview: updatedPricePeriods?.substring(0, 200),
      });
      
      await updateContract(contract.id, (current) => {
        const updated = {
          ...current,
          periodPrice: {
            ...current.periodPrice,
            price_periods: updatedPricePeriods,
            flat_price_mwh: current.periodPrice?.flat_price_mwh ?? null,
            flat_years: current.periodPrice?.flat_years ?? null,
          },
        };
        
        console.log('[VolumeContratadoModal] 📤 Payload que será enviado:', {
          hasPeriodPrice: !!updated.periodPrice,
          hasPricePeriods: !!updated.periodPrice?.price_periods,
          pricePeriodsType: typeof updated.periodPrice?.price_periods,
          pricePeriodsLength: typeof updated.periodPrice?.price_periods === 'string' 
            ? updated.periodPrice.price_periods.length 
            : 'não é string',
        });
        
        return updated;
      });
      
      // Chama callback com volumes atualizados (apenas valores não-nulos)
      if (onSave) {
        const volumesForCallback: Record<string, number> = {};
        Object.entries(updatedVolumes).forEach(([ym, value]) => {
          if (value !== null && value !== undefined) {
            volumesForCallback[ym] = value;
          }
        });
        onSave(volumesForCallback);
      }
      
      toast.success('Volumes atualizados com sucesso!');
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('[VolumeContratadoModal] Erro ao salvar volumes:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar volumes');
    } finally {
      setIsSaving(false);
    }
  }, [contract, monthRows, updateContract, onSave, onClose, isSaving]);
  
  const handleClose = React.useCallback(() => {
    if (hasChanges) {
      const confirm = window.confirm('Existem alterações não salvas. Deseja sair sem salvar?');
      if (!confirm) return;
    }
    onClose();
  }, [hasChanges, onClose]);
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Volume Contratado por Mês
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {contract?.cliente || 'Contrato'} • {contract?.codigo || contractId}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {!contract ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-yn-orange" />
            </div>
          ) : monthRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">
                Nenhum mês encontrado
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Verifique se o contrato possui datas de vigência definidas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Mês
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Horas
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Vol. Sazonal MWh
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monthRows.map((row) => {
                    const isCurrentMonth = row.ym === balanceMonth;
                    const isEditing = row.ym in editingValues;
                    
                    return (
                      <tr
                        key={row.ym}
                        className={`transition ${
                          isCurrentMonth
                            ? 'bg-yn-orange/10 dark:bg-yn-orange/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 dark:text-white">
                              {formatMonthLabel(row.ym)}
                            </span>
                            {isCurrentMonth && (
                              <span className="rounded-full bg-yn-orange px-2 py-0.5 text-[10px] font-semibold text-white">
                                Atual
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                          {row.hoursInMonth}h
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={
                              isEditing
                                ? editingValues[row.ym]
                                : row.volumeSeasonalizedMWh !== null
                                ? row.volumeSeasonalizedMWh.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                : ''
                            }
                            onChange={(e) => handleVolumeChange(row.ym, e.target.value)}
                            onBlur={() => handleVolumeBlur(row.ym)}
                            placeholder="0,00"
                            className={`w-full rounded-lg border px-3 py-2 text-right text-sm tabular-nums shadow-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:bg-slate-900 ${
                              isCurrentMonth
                                ? 'border-yn-orange/50 bg-white dark:border-yn-orange/30'
                                : 'border-slate-300 bg-white dark:border-slate-700'
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="text-sm text-slate-500">
            {hasChanges && (
              <span className="text-yn-orange font-medium">Alterações não salvas</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasChanges || monthRows.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-yn-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

