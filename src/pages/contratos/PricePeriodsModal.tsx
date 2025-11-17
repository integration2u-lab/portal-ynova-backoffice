import React from 'react';
import { Plus, Trash2, X, Eraser } from 'lucide-react';
import { formatCurrencyBRL, formatCurrencyInputBlur, parseCurrencyInput, sanitizeCurrencyInput } from '../../utils/currency';
import { monthsBetween } from '../../utils/dateRange';
import type { VolumeUnit } from '../../types/pricePeriods';

const volumeUnitOptions: Array<{ value: VolumeUnit; label: string }> = [
  { value: 'MWH', label: 'MWh' },
  { value: 'MW_MEDIO', label: 'MW médio' },
];

const DEFAULT_VOLUME_UNIT: VolumeUnit = 'MWH';

const normalizeVolumeUnit = (value: unknown): VolumeUnit => {
  if (typeof value !== 'string') return DEFAULT_VOLUME_UNIT;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'MW_MEDIO' || normalized === 'MW MÉDIO' || normalized === 'MW MEDIO') {
    return 'MW_MEDIO';
  }
  return 'MWH';
};

export type PricePeriods = {
  periods: Array<{
    id: string;
    start: string; // YYYY-MM
    end: string; // YYYY-MM
    defaultPrice?: number;
    defaultVolume?: number | null;
    defaultVolumeUnit?: VolumeUnit | null;
    months: Array<{ ym: string; price: number; volume?: number | null; volumeUnit?: VolumeUnit | null }>;
  }>;
};

export type PricePeriodsSummary = {
  filledMonths: number;
  averagePrice: number | null;
};

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' });

const ensureRandomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export function summarizePricePeriods(value: PricePeriods): PricePeriodsSummary {
  const monthMap = new Map<string, number>();
  value.periods.forEach((period) => {
    period.months.forEach(({ ym, price }) => {
      if (Number.isFinite(price)) {
        monthMap.set(ym, price);
      }
    });
  });
  const prices = Array.from(monthMap.values());
  const filledMonths = prices.length;
  if (!filledMonths) {
    return { filledMonths: 0, averagePrice: null };
  }
  const sum = prices.reduce((acc, price) => acc + price, 0);
  return { filledMonths, averagePrice: sum / filledMonths };
}

type MonthDraft = {
  ym: string;
  value: string;
  volume: string;
  volumeUnit: VolumeUnit;
};

type PeriodDraft = {
  id: string;
  start: string;
  end: string;
  defaultPrice: string;
  months: MonthDraft[];
  defaultVolume: string;
  defaultVolumeUnit: VolumeUnit;
};

const toInputString = (value?: number) =>
  value === undefined || value === null || Number.isNaN(value)
    ? ''
    : value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const buildDraftFromPeriod = (period: PricePeriods['periods'][number]): PeriodDraft => ({
  id: period.id || ensureRandomId(),
  start: period.start,
  end: period.end,
  defaultPrice: toInputString(period.defaultPrice),
  defaultVolume: toInputString(period.defaultVolume ?? undefined),
  defaultVolumeUnit: normalizeVolumeUnit(period.defaultVolumeUnit),
  months: monthsBetween(period.start, period.end).map((ym) => {
    const existing = period.months.find((month) => month.ym === ym);
    const priceValue = existing ? toInputString(existing.price) : '';
    const volumeValue = existing ? toInputString(existing.volume ?? undefined) : '';
    const volumeUnit = existing ? normalizeVolumeUnit(existing.volumeUnit) : normalizeVolumeUnit(period.defaultVolumeUnit);
    return { ym, value: priceValue, volume: volumeValue, volumeUnit };
  }),
});

const buildEmptyDraft = (): PeriodDraft => {
  const now = new Date();
  const year = now.getFullYear();
  const start = `${year}-01`;
  const end = `${year}-12`;
  return {
    id: ensureRandomId(),
    start,
    end,
    defaultPrice: '',
    defaultVolume: '',
    defaultVolumeUnit: DEFAULT_VOLUME_UNIT,
    months: monthsBetween(start, end).map((ym) => ({ ym, value: '', volume: '', volumeUnit: DEFAULT_VOLUME_UNIT })),
  };
};

const ensureMonthsForDraft = (draft: PeriodDraft): PeriodDraft => {
  const monthList = monthsBetween(draft.start, draft.end);
  const existing = new Map(draft.months.map((month) => [month.ym, month]));
  return {
    ...draft,
    months: monthList.map((ym) => {
      const current = existing.get(ym);
      if (current) {
        return {
          ym,
          value: current.value,
          volume: current.volume,
          volumeUnit: normalizeVolumeUnit(current.volumeUnit),
        };
      }
      return { ym, value: '', volume: '', volumeUnit: draft.defaultVolumeUnit ?? DEFAULT_VOLUME_UNIT };
    }),
  };
};

type PricePeriodsModalProps = {
  open: boolean;
  value: PricePeriods;
  onClose: () => void;
  onSave: (value: PricePeriods) => void;
};

function formatMonthLabel(ym: string) {
  const [year, month] = ym.split('-').map(Number);
  if (!year || !month) return ym;
  const date = new Date(year, month - 1, 1);
  return monthFormatter.format(date);
}

function normalizeDrafts(value: PricePeriods): PeriodDraft[] {
  if (!value.periods.length) {
    return [buildEmptyDraft()];
  }
  return value.periods.map(buildDraftFromPeriod);
}

const PricePeriodsModal: React.FC<PricePeriodsModalProps> = ({ open, value, onClose, onSave }) => {
  const [drafts, setDrafts] = React.useState<PeriodDraft[]>(() => normalizeDrafts(value));
  const [isSaved, setIsSaved] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setDrafts(normalizeDrafts(value));
      setIsSaved(false);
    }
  }, [open, value]);

  const isSaveDisabled = React.useMemo(
    () => {
      const disabled = drafts.some((draft) => monthsBetween(draft.start, draft.end).length === 0);
      console.log('isSaveDisabled:', disabled, { drafts });
      return disabled;
    },
    [drafts]
  );

  const handleAddPeriod = React.useCallback(() => {
    setDrafts((prev) => [...prev, buildEmptyDraft()]);
  }, []);

  const updateDraft = React.useCallback((id: string, updater: (draft: PeriodDraft) => PeriodDraft) => {
    setDrafts((prev) => prev.map((draft) => (draft.id === id ? ensureMonthsForDraft(updater(draft)) : draft)));
  }, []);

  const handleChangeStart = React.useCallback((id: string, value: string) => {
    updateDraft(id, (draft) => ({ ...draft, start: value || draft.start }));
  }, [updateDraft]);

  const handleChangeEnd = React.useCallback((id: string, value: string) => {
    updateDraft(id, (draft) => ({ ...draft, end: value || draft.end }));
  }, [updateDraft]);

  const handleDefaultChange = React.useCallback((id: string, value: string) => {
    const sanitized = sanitizeCurrencyInput(value);
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === id
          ? {
              ...draft,
              defaultPrice: sanitized,
            }
          : draft
      )
    );
  }, []);

  const handleDefaultBlur = React.useCallback((id: string) => {
    setDrafts((prev) =>
      prev.map((draft) => {
        if (draft.id !== id) return draft;
        const formatted = formatCurrencyInputBlur(draft.defaultPrice);
        if (!formatted) {
          return { ...draft, defaultPrice: '', months: draft.months.map((month) => ({ ...month, value: month.value })) };
        }
        return {
          ...draft,
          defaultPrice: formatted,
          months: draft.months.map((month) => ({
            ...month,
            value: month.value ? formatCurrencyInputBlur(month.value) : formatted,
          })),
        };
      })
    );
  }, []);

  const handleMonthChange = React.useCallback((periodId: string, ym: string, value: string) => {
    const sanitized = sanitizeCurrencyInput(value);
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === periodId
          ? {
              ...draft,
              months: draft.months.map((month) =>
                month.ym === ym
                  ? {
                      ...month,
                      value: sanitized,
                    }
                  : month
              ),
            }
          : draft
      )
    );
  }, []);

  const handleMonthBlur = React.useCallback((periodId: string, ym: string) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === periodId
          ? {
              ...draft,
              months: draft.months.map((month) =>
                month.ym === ym
                  ? { ...month, value: month.value ? formatCurrencyInputBlur(month.value) : '' }
                  : month
              ),
            }
          : draft
      )
    );
  }, []);

  const handleMonthVolumeChange = React.useCallback((periodId: string, ym: string, value: string) => {
    const sanitized = sanitizeCurrencyInput(value);
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === periodId
          ? {
              ...draft,
              months: draft.months.map((month) =>
                month.ym === ym
                  ? {
                      ...month,
                      volume: sanitized,
                    }
                  : month
              ),
            }
          : draft
      )
    );
  }, []);

  const handleMonthVolumeBlur = React.useCallback((periodId: string, ym: string) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === periodId
          ? {
              ...draft,
              months: draft.months.map((month) =>
                month.ym === ym
                  ? { ...month, volume: month.volume ? formatCurrencyInputBlur(month.volume) : '' }
                  : month
              ),
            }
          : draft
      )
    );
  }, []);

  const handleMonthVolumeUnitChange = React.useCallback((periodId: string, ym: string, unit: VolumeUnit) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === periodId
          ? {
              ...draft,
              months: draft.months.map((month) =>
                month.ym === ym
                  ? {
                      ...month,
                      volumeUnit: unit,
                    }
                  : month
              ),
            }
          : draft
      )
    );
  }, []);

  const handleRemovePeriod = React.useCallback((id: string) => {
    setDrafts((prev) => (prev.length <= 1 ? prev : prev.filter((draft) => draft.id !== id)));
  }, []);

  const handleClearPeriod = React.useCallback((id: string) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === id
          ? {
              ...draft,
              defaultPrice: '',
              defaultVolume: '',
              defaultVolumeUnit: DEFAULT_VOLUME_UNIT,
              months: draft.months.map((month) => ({ ...month, value: '', volume: '', volumeUnit: DEFAULT_VOLUME_UNIT })),
            }
          : draft
      )
    );
  }, []);

  const handleSubmit = React.useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      console.log('Iniciando salvamento...', { drafts });
      
      try {
        const periods = drafts.map((draft) => {
          const months = draft.months.reduce<
            Array<{ ym: string; price: number; volume?: number | null; volumeUnit?: VolumeUnit | null }>
          >((acc, month) => {
            const price = parseCurrencyInput(month.value);
            if (price === null || !Number.isFinite(price)) {
              return acc;
            }
            const volumeValue = parseCurrencyInput(month.volume);
            const volumeUnit = volumeValue !== null ? normalizeVolumeUnit(month.volumeUnit) : null;
            acc.push({
              ym: month.ym,
              price,
              volume: volumeValue ?? null,
              volumeUnit,
            });
            return acc;
          }, []);
          const defaultVolumeValue = parseCurrencyInput(draft.defaultVolume);
          return {
            id: draft.id,
            start: draft.start,
            end: draft.end,
            defaultPrice: parseCurrencyInput(draft.defaultPrice) ?? undefined,
            defaultVolume: defaultVolumeValue ?? undefined,
            defaultVolumeUnit:
              defaultVolumeValue !== null ? draft.defaultVolumeUnit ?? DEFAULT_VOLUME_UNIT : undefined,
            months,
          };
        });
        
        console.log('Períodos processados:', periods);
        
        // Calculate average price from the first period with data
        const firstPeriodWithData = periods.find(period => period.months.length > 0);
        const averagePrice = firstPeriodWithData?.months.length 
          ? firstPeriodWithData.months.reduce((sum, month) => sum + month.price, 0) / firstPeriodWithData.months.length
          : firstPeriodWithData?.defaultPrice || 0;
        
        console.log('Preço médio calculado:', averagePrice);
        
        onSave({ periods });
        setIsSaved(true);
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } catch (error) {
        console.error('Erro ao salvar preços:', error);
        alert('Erro ao salvar os preços. Verifique o console para mais detalhes.');
      }
    },
    [drafts, onSave, onClose]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-6 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Preços médios (R$/MWh)</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Defina períodos e valores mensais aplicados para cálculo dos preços médios do contrato.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900"
            aria-label="Fechar preços médios"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {isSaved && (
              <div className="mb-6 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-200">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="font-semibold">Preços salvos com sucesso!</span>
                </div>
                <p className="mt-1 text-xs">Os dados foram salvos e o preço médio foi calculado automaticamente.</p>
              </div>
            )}
            <div className="space-y-5">
              {drafts.map((draft, index) => {
              const months = monthsBetween(draft.start, draft.end);
              const hasInvalidRange = months.length === 0 && draft.start && draft.end;
              const prices = draft.months
                .map((month) => parseCurrencyInput(month.value))
                .filter((value): value is number => value !== null);
              const filled = prices.length;
              const average = filled ? prices.reduce((acc, price) => acc + price, 0) / filled : null;

              const grouped = months.reduce<Record<string, string[]>>((acc, ym) => {
                const [year] = ym.split('-');
                acc[year] = acc[year] ? [...acc[year], ym] : [ym];
                return acc;
              }, {});

              return (
                <section
                  key={draft.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Período {index + 1}
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                          Início
                          <input
                            type="month"
                            value={draft.start}
                            onChange={(event) => handleChangeStart(draft.id, event.target.value)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                          Fim
                          <input
                            type="month"
                            value={draft.end}
                            onChange={(event) => handleChangeEnd(draft.id, event.target.value)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                          Preço padrão do período
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              R$
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={draft.defaultPrice}
                              onChange={(event) => handleDefaultChange(draft.id, event.target.value)}
                              onBlur={() => handleDefaultBlur(draft.id)}
                              placeholder="0,00"
                              className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm shadow-sm transition focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                            />
                          </div>
                        </label>
                      </div>
                      {hasInvalidRange && (
                        <p className="text-xs font-medium text-red-500">
                          Defina um período válido (início deve ser anterior ou igual ao fim).
                        </p>
                      )}
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {filled
                          ? `${filled} ${filled === 1 ? 'mês preenchido' : 'meses preenchidos'} · ${formatCurrencyBRL(average ?? 0)}`
                          : 'Nenhum mês preenchido'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start md:self-center">
                      <button
                        type="button"
                        onClick={() => handleClearPeriod(draft.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Eraser size={16} /> Limpar período
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePeriod(draft.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-600 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
                        disabled={drafts.length <= 1}
                      >
                        <Trash2 size={16} /> Remover
                      </button>
                    </div>
                  </header>

                  <div className="mt-4 space-y-4">
                    {Object.entries(grouped).map(([year, yearMonths]) => (
                      <div key={year} className="space-y-3">
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{year}</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {yearMonths.map((ym) => {
                            const month = draft.months.find((item) => item.ym === ym);
                            return (
                              <label
                                key={ym}
                                className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-yn-orange dark:border-slate-700 dark:bg-slate-950"
                              >
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                  {formatMonthLabel(ym)}
                                </span>
                                <div className="relative">
                                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    R$
                                  </span>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={month?.value ?? ''}
                                    onChange={(event) => handleMonthChange(draft.id, ym, event.target.value)}
                                    onBlur={() => handleMonthBlur(draft.id, ym)}
                                    placeholder="0,00"
                                    className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-900"
                                  />
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={month?.volume ?? ''}
                                      onChange={(event) => handleMonthVolumeChange(draft.id, ym, event.target.value)}
                                      onBlur={() => handleMonthVolumeBlur(draft.id, ym)}
                                      placeholder="Volume contratado"
                                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-900"
                                    />
                                  </div>
                                  <select
                                    value={month?.volumeUnit ?? DEFAULT_VOLUME_UNIT}
                                    onChange={(event) =>
                                      handleMonthVolumeUnitChange(draft.id, ym, event.target.value as VolumeUnit)
                                    }
                                    className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-900"
                                  >
                                    {volumeUnitOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {!months.length && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Ajuste o período para visualizar os meses disponíveis.
                      </p>
                    )}
                  </div>
                </section>
              );
            })}

              <button
                type="button"
                onClick={handleAddPeriod}
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-yn-orange px-4 py-3 text-sm font-semibold text-yn-orange transition hover:bg-yn-orange/10"
              >
                <Plus size={18} /> Adicionar período
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-yn-orange hover:text-yn-orange dark:border-slate-700 dark:text-slate-300 dark:hover:border-yn-orange"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaveDisabled || isSaved}
              onClick={(e) => {
                console.log('Botão clicado', { isSaveDisabled, isSaved });
                if (isSaveDisabled) {
                  e.preventDefault();
                  console.log('Botão desabilitado - não pode salvar');
                  return;
                }
              }}
              className="rounded-lg bg-yn-orange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaved ? 'Salvo!' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PricePeriodsModal;
