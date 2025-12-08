import React from 'react';
import { X, Loader } from 'lucide-react';
import { formatCurrencyBRL } from '../../utils/currency';
import { monthsBetween } from '../../utils/dateRange';
import type { MonthRow, YearTab } from '../../types/pricePeriods';
import { 
  getHoursInMonth, 
  calculateVolumeMWh, 
  calculateVolumeMWm,
  calculateFlexibilityMax, 
  calculateFlexibilityMin 
} from '../../utils/contractPricing';
import { 
  fetchIPCAMultipliersWithCache,
  getIPCAMultiplierForMonth,
  type IPCAMultiplier 
} from '../../services/ipcaApi';

export type PricePeriods = {
  periods: Array<{
    id: string;
    start: string;
    end: string;
    defaultPrice?: number;
    defaultVolume?: number | null;
    defaultVolumeUnit?: string | null;
    months: Array<{
      ym: string;
      price?: number;
      volume?: number | null;
      volumeUnit?: string | null;
      // Campos completos salvos no JSON
      hoursInMonth?: number;
      volumeMWm?: number | null;
      volumeMWh?: number | null;
      volumeSeasonalizedMWh?: number | null;
      flexibilityMaxMWh?: number | null;
      flexibilityMinMWh?: number | null;
      basePrice?: number | null;
      adjustedPrice?: number | null;
    }>;
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
    period.months.forEach(({ ym, price, basePrice }) => {
      const priceValue = basePrice ?? price;
      if (priceValue !== null && priceValue !== undefined && Number.isFinite(priceValue)) {
        monthMap.set(ym, priceValue);
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

type PricePeriodsModalProps = {
  open: boolean;
  value: PricePeriods;
  onClose: () => void;
  onSave: (value: PricePeriods) => void;
  contractStartDate?: string; // YYYY-MM-DD
  contractEndDate?: string; // YYYY-MM-DD
  flexibilityUpper?: number; // Percentual (ex: 50 para 50%)
  flexibilityLower?: number; // Percentual (ex: 50 para 50%)
};

function formatMonthLabel(ym: string) {
  const [year, month] = ym.split('-').map(Number);
  if (!year || !month) return ym;
  const date = new Date(year, month - 1, 1);
  return monthFormatter.format(date);
}

/**
 * Extrai os anos da vigência do contrato
 */
function getYearsFromContract(startDate: string | undefined, endDate: string | undefined): number[] {
  if (!startDate || !endDate) {
    const currentYear = new Date().getFullYear();
    return [currentYear];
  }
  
  const startYear = parseInt(startDate.substring(0, 4), 10);
  const endYear = parseInt(endDate.substring(0, 4), 10);
  
  if (isNaN(startYear) || isNaN(endYear)) {
    const currentYear = new Date().getFullYear();
    return [currentYear];
  }
  
  const years: number[] = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }
  
  return years;
}

/**
 * Inicializa os dados das abas de anos
 */
function initializeYearTabs(
  years: number[],
  existingPeriods: PricePeriods['periods'],
  contractStartDate: string | undefined,
  contractEndDate: string | undefined
): YearTab[] {
  const existingData = new Map<string, { 
    hoursInMonth?: number;
    volumeMWm?: number | null; 
    volumeMWh?: number | null;
    volumeSeasonalizedMWh?: number | null;
    flexibilityMaxMWh?: number | null;
    flexibilityMinMWh?: number | null;
    basePrice?: number | null;
  }>();
  
  // Extrai dados existentes (carrega TUDO que foi salvo)
  existingPeriods.forEach((period) => {
    period.months.forEach((month) => {
      existingData.set(month.ym, {
        hoursInMonth: month.hoursInMonth,
        volumeMWm: month.volumeMWm ?? null,
        volumeMWh: month.volumeMWh ?? month.volume ?? null,
        volumeSeasonalizedMWh: month.volumeSeasonalizedMWh ?? null,
        flexibilityMaxMWh: month.flexibilityMaxMWh ?? null,
        flexibilityMinMWh: month.flexibilityMinMWh ?? null,
        basePrice: month.basePrice ?? month.price ?? null,
      });
    });
  });
  
  return years.map((year) => {
    const yearStart = `${year}-01`;
    const yearEnd = `${year}-12`;
    
    // Filtra meses baseado na vigência do contrato
    let months = monthsBetween(yearStart, yearEnd);
    
    if (contractStartDate && contractEndDate) {
      const contractStart = contractStartDate.substring(0, 7); // YYYY-MM
      const contractEnd = contractEndDate.substring(0, 7); // YYYY-MM
      
      months = months.filter((ym) => ym >= contractStart && ym <= contractEnd);
    }
    
    return {
      year,
      months: months.map((ym): MonthRow => {
        const [y, m] = ym.split('-').map(Number);
        const existing = existingData.get(ym);
        const hoursInMonth = existing?.hoursInMonth ?? getHoursInMonth(y, m);
        
        return {
          ym,
          hoursInMonth,
          volumeMWm: existing?.volumeMWm ?? null,
          volumeMWh: existing?.volumeMWh ?? null,
          volumeSeasonalizedMWh: existing?.volumeSeasonalizedMWh ?? null,
          flexibilityMaxMWh: existing?.flexibilityMaxMWh ?? null,
          flexibilityMinMWh: existing?.flexibilityMinMWh ?? null,
          basePrice: existing?.basePrice ?? null,
          adjustedPrice: null, // Sempre recalculado pelo useEffect
        };
      }),
    };
  });
}

const PricePeriodsModal: React.FC<PricePeriodsModalProps> = ({ 
  open, 
  value, 
  onClose, 
  onSave,
  contractStartDate,
  contractEndDate,
  flexibilityUpper = 0,
  flexibilityLower = 0,
}) => {
  // Normaliza os valores recebidos (Flexibilidade Superior e Inferior do contrato)
  const upperValue = React.useMemo(() => {
    const num = Number(flexibilityUpper);
    return Number.isFinite(num) && num >= 0 ? num : 200;
  }, [flexibilityUpper]);
  
  const lowerValue = React.useMemo(() => {
    const num = Number(flexibilityLower);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  }, [flexibilityLower]);
  
  console.log('[PricePeriodsModal] 🔧 Valores de flexibilidade recebidos (Flexibilidade Superior e Inferior):', {
    flexibilityUpper,
    flexibilityLower,
    upperValue,
    lowerValue,
    '✅ USANDO': 'Flexibilidade Superior e Inferior do contrato',
  });
  
  const years = React.useMemo(() => 
    getYearsFromContract(contractStartDate, contractEndDate), 
    [contractStartDate, contractEndDate]
  );
  
  const [yearTabs, setYearTabs] = React.useState<YearTab[]>(() => 
    initializeYearTabs(years, value.periods, contractStartDate, contractEndDate)
  );
  
  const [activeTab, setActiveTab] = React.useState(0);
  const [ipcaMultipliers, setIpcaMultipliers] = React.useState<IPCAMultiplier[]>([]);
  const [isLoadingIPCA, setIsLoadingIPCA] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  
  // Estados para controlar a edição de campos (mantém o texto enquanto usuário digita)
  const [editingVolumeMWm, setEditingVolumeMWm] = React.useState<Record<string, string>>({});
  const [editingVolumeMWh, setEditingVolumeMWh] = React.useState<Record<string, string>>({});
  const [editingVolumeSeasonal, setEditingVolumeSeasonal] = React.useState<Record<string, string>>({});
  const [editingPrice, setEditingPrice] = React.useState<Record<string, string>>({});
  const [editingAdjustedPrice, setEditingAdjustedPrice] = React.useState<Record<string, string>>({});

  // Carrega dados do IPCA ao abrir o modal usando a vigência do contrato
  React.useEffect(() => {
    if (open) {
      setIsLoadingIPCA(true);
      
      // Log das datas recebidas para diagnóstico
      console.log('[PricePeriodsModal] 📅 Datas de vigência recebidas:', {
        contractStartDate,
        contractEndDate,
        startDateType: typeof contractStartDate,
        endDateType: typeof contractEndDate,
        startDateValido: contractStartDate ? !isNaN(new Date(contractStartDate).getTime()) : false,
        endDateValido: contractEndDate ? !isNaN(new Date(contractEndDate).getTime()) : false,
      });
      
      // Usa as datas de vigência do contrato para buscar os multiplicadores do IPCA do backend
      fetchIPCAMultipliersWithCache(contractStartDate, contractEndDate, 60)
        .then((multipliers) => {
          if (multipliers && multipliers.length > 0) {
            setIpcaMultipliers(multipliers);
            console.log('[PricePeriodsModal] ✅ Multiplicadores IPCA carregados com sucesso para vigência do contrato:', {
              totalMultipliers: multipliers.length,
              primeiroMultiplier: multipliers[0]?.month,
              ultimoMultiplier: multipliers[multipliers.length - 1]?.month,
            });
          } else {
            console.warn('[PricePeriodsModal] ⚠️ Nenhum dado do IPCA disponível - preços reajustados não serão calculados');
            setIpcaMultipliers([]);
          }
        })
        .catch((error) => {
          console.error('[PricePeriodsModal] ❌ Erro ao carregar multiplicadores IPCA:', error);
          setIpcaMultipliers([]);
        })
        .finally(() => {
          setIsLoadingIPCA(false);
        });
      
      // Reinicializa abas ao abrir
      setYearTabs(initializeYearTabs(years, value.periods, contractStartDate, contractEndDate));
      setIsSaved(false);
      setActiveTab(0);
      // Limpa estados de edição
      setEditingVolumeMWm({});
      setEditingVolumeMWh({});
      setEditingVolumeSeasonal({});
      setEditingPrice({});
    }
  }, [open, years, value.periods, contractStartDate, contractEndDate, upperValue, lowerValue]);
  
  // Limpa estados de edição ao trocar de aba
  React.useEffect(() => {
    setEditingVolumeMWm({});
    setEditingVolumeMWh({});
    setEditingVolumeSeasonal({});
    setEditingPrice({});
  }, [activeTab]);

  // Recalcula volumes e flexibilidades quando dados mudam
  React.useEffect(() => {
    setYearTabs((prev) =>
      prev.map((tab) => ({
        ...tab,
        months: tab.months.map((month) => {
          let volumeMWm = month.volumeMWm;
          let volumeMWh = month.volumeMWh;
          let volumeSeasonalizedMWh = month.volumeSeasonalizedMWh;
          let flexibilityMaxMWh = month.flexibilityMaxMWh;
          let flexibilityMinMWh = month.flexibilityMinMWh;
          let adjustedPrice = month.adjustedPrice;
          
          // Calcula Volume MWh se tiver volumeMWm (apenas se volumeMWh ainda não foi definido manualmente)
          if (volumeMWm !== null && Number.isFinite(volumeMWm) && (volumeMWh === null || volumeMWh === undefined)) {
            volumeMWh = calculateVolumeMWh(volumeMWm, month.hoursInMonth);
          }
          
          // Calcula Volume MWm se tiver volumeMWh (apenas se volumeMWm ainda não foi definido manualmente)
          if (volumeMWh !== null && Number.isFinite(volumeMWh) && (volumeMWm === null || volumeMWm === undefined)) {
            volumeMWm = calculateVolumeMWm(volumeMWh, month.hoursInMonth);
          }
          
          // Se tem volumeMWh (calculado ou manual), calcula os campos dependentes
          if (volumeMWh !== null && Number.isFinite(volumeMWh)) {
            // Volume Sazonalizado replica o Volume MWh
            volumeSeasonalizedMWh = volumeMWh;
            
            // Calcula flexibilidades usando Flexibilidade Superior e Inferior do contrato
            if (volumeSeasonalizedMWh !== null && Number.isFinite(volumeSeasonalizedMWh)) {
              flexibilityMaxMWh = calculateFlexibilityMax(volumeSeasonalizedMWh, upperValue);
              flexibilityMinMWh = calculateFlexibilityMin(volumeSeasonalizedMWh, lowerValue);
            }
          }
          
          // Calcula Preço Reajustado se tiver basePrice e IPCA
          if (month.basePrice !== null && Number.isFinite(month.basePrice) && ipcaMultipliers.length > 0) {
            const multiplier = getIPCAMultiplierForMonth(ipcaMultipliers, month.ym);
            adjustedPrice = month.basePrice * multiplier;
          } else if (month.basePrice === null) {
            adjustedPrice = null;
          }
          
          return {
            ...month,
            volumeMWm,
            volumeMWh,
            volumeSeasonalizedMWh,
            flexibilityMaxMWh,
            flexibilityMinMWh,
            adjustedPrice,
          };
        }),
      }))
    );
  }, [upperValue, lowerValue, ipcaMultipliers]);

  const handleVolumeMWmChange = React.useCallback((yearIndex: number, monthIndex: number, value: string, monthYm: string) => {
    const key = `${yearIndex}-${monthIndex}`;
    
    // Remove espaços e caracteres inválidos, mas mantém números, vírgula e ponto
    const cleaned = value.replace(/\s/g, '').replace(/[^0-9,.]/g, '');
    
    // Mantém o texto enquanto o usuário digita
    setEditingVolumeMWm((prev) => ({ ...prev, [key]: cleaned }));
    
    if (!cleaned) {
      setYearTabs((prev) => {
        const updated = [...prev];
        const month = updated[yearIndex].months[monthIndex];
        month.volumeMWm = null;
        month.volumeMWh = null;
        month.volumeSeasonalizedMWh = null;
        month.flexibilityMaxMWh = null;
        month.flexibilityMinMWh = null;
        return updated;
      });
      return;
    }
    
    // Converte para número (aceita tanto , quanto . como separador decimal)
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    
    if (!isNaN(parsed) && isFinite(parsed)) {
      setYearTabs((prev) => {
        const updated = [...prev];
        const month = updated[yearIndex].months[monthIndex];
        
        // Atualiza Volume MWm
        month.volumeMWm = parsed;
        
        // Calcula Volume MWh automaticamente se ainda não foi preenchido manualmente
        // ou se foi preenchido mas está vazio/null
        if (month.volumeMWh === null || month.volumeMWh === undefined) {
          const [year, monthNum] = monthYm.split('-').map(Number);
          const hours = getHoursInMonth(year, monthNum);
          month.volumeMWh = calculateVolumeMWh(parsed, hours);
          month.volumeSeasonalizedMWh = month.volumeMWh;
          month.flexibilityMaxMWh = calculateFlexibilityMax(month.volumeSeasonalizedMWh, upperValue);
          month.flexibilityMinMWh = calculateFlexibilityMin(month.volumeSeasonalizedMWh, lowerValue);
        } else {
          // Se Volume MWh já foi preenchido, mantém os campos dependentes baseados nele
          month.volumeSeasonalizedMWh = month.volumeMWh;
          month.flexibilityMaxMWh = calculateFlexibilityMax(month.volumeSeasonalizedMWh, upperValue);
          month.flexibilityMinMWh = calculateFlexibilityMin(month.volumeSeasonalizedMWh, lowerValue);
        }
        
        return updated;
      });
    }
  }, [upperValue, lowerValue]);
  
  const handleVolumeMWmBlur = React.useCallback((yearIndex: number, monthIndex: number) => {
    const key = `${yearIndex}-${monthIndex}`;
    setEditingVolumeMWm((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  }, []);

  const handleVolumeMWhChange = React.useCallback((yearIndex: number, monthIndex: number, value: string, monthYm: string) => {
    const key = `${yearIndex}-${monthIndex}`;
    
    // Remove espaços e caracteres inválidos, mas mantém números, vírgula e ponto
    const cleaned = value.replace(/\s/g, '').replace(/[^0-9,.]/g, '');
    
    // Mantém o texto enquanto o usuário digita
    setEditingVolumeMWh((prev) => ({ ...prev, [key]: cleaned }));
    
    if (!cleaned) {
      setYearTabs((prev) => {
        const updated = [...prev];
        const month = updated[yearIndex].months[monthIndex];
        month.volumeMWh = null;
        month.volumeMWm = null;
        month.volumeSeasonalizedMWh = null;
        month.flexibilityMaxMWh = null;
        month.flexibilityMinMWh = null;
        return updated;
      });
      // Limpa o estado de edição também
      setEditingVolumeMWh((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
      return;
    }
    
    // Converte para número (aceita tanto , quanto . como separador decimal)
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    
    if (!isNaN(parsed) && isFinite(parsed)) {
      setYearTabs((prev) => {
        const updated = [...prev];
        const month = updated[yearIndex].months[monthIndex];
        
        // Atualiza Volume MWh diretamente
        month.volumeMWh = parsed;
        
        // Sempre calcula Volume MWm quando Volume MWh é preenchido manualmente
        const [year, monthNum] = monthYm.split('-').map(Number);
        const hours = getHoursInMonth(year, monthNum);
        const calculatedVolumeMWm = calculateVolumeMWm(parsed, hours);
        month.volumeMWm = calculatedVolumeMWm;
        
        // Atualiza o estado de edição do Volume MWm para que o valor calculado seja exibido imediatamente
        const mwmKey = `${yearIndex}-${monthIndex}`;
        setEditingVolumeMWm((prev) => ({
          ...prev,
          [mwmKey]: calculatedVolumeMWm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        }));
        
        console.log('[PricePeriodsModal] 📊 Volume MWh preenchido:', {
          monthYm,
          volumeMWh: parsed,
          hours,
          volumeMWmCalculado: calculatedVolumeMWm,
        });
        
        // Recalcula campos dependentes
        month.volumeSeasonalizedMWh = parsed;
        month.flexibilityMaxMWh = calculateFlexibilityMax(parsed, upperValue);
        month.flexibilityMinMWh = calculateFlexibilityMin(parsed, lowerValue);
        
        return updated;
      });
    }
  }, [upperValue, lowerValue]);
  
  const handleVolumeMWhBlur = React.useCallback((yearIndex: number, monthIndex: number) => {
    const key = `${yearIndex}-${monthIndex}`;
    setEditingVolumeMWh((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  }, []);

  const handleVolumeSeasonalChange = React.useCallback((yearIndex: number, monthIndex: number, value: string) => {
    const key = `${yearIndex}-${monthIndex}`;
    
    // Remove espaços e caracteres inválidos, mas mantém números, vírgula e ponto
    const cleaned = value.replace(/\s/g, '').replace(/[^0-9,.]/g, '');
    
    // Mantém o texto enquanto o usuário digita
    setEditingVolumeSeasonal((prev) => ({ ...prev, [key]: cleaned }));
    
    if (!cleaned) {
      setYearTabs((prev) => {
        const updated = [...prev];
        const month = updated[yearIndex].months[monthIndex];
        month.volumeSeasonalizedMWh = null;
        month.flexibilityMaxMWh = null;
        month.flexibilityMinMWh = null;
        return updated;
      });
      return;
    }
    
    // Converte para número (aceita tanto , quanto . como separador decimal)
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    
    if (!isNaN(parsed) && isFinite(parsed)) {
      setYearTabs((prev) => {
        const updated = [...prev];
        const month = updated[yearIndex].months[monthIndex];
        
        // Atualiza Volume Sazonalizado diretamente
        month.volumeSeasonalizedMWh = parsed;
        
        // Recalcula flexibilidades usando Flexibilidade Superior e Inferior do contrato
        month.flexibilityMaxMWh = calculateFlexibilityMax(parsed, upperValue);
        month.flexibilityMinMWh = calculateFlexibilityMin(parsed, lowerValue);
        
        return updated;
      });
    }
  }, [upperValue, lowerValue]);
  
  const handleVolumeSeasonalBlur = React.useCallback((yearIndex: number, monthIndex: number) => {
    const key = `${yearIndex}-${monthIndex}`;
    setEditingVolumeSeasonal((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  }, []);

  const handleBasePriceChange = React.useCallback((yearIndex: number, monthIndex: number, value: string, monthYm: string) => {
    const key = `${yearIndex}-${monthIndex}`;
    
    // Remove espaços e caracteres inválidos, mas mantém números, vírgula e ponto
    const cleaned = value.replace(/\s/g, '').replace(/[^0-9,.]/g, '');
    
    // Mantém o texto enquanto o usuário digita
    setEditingPrice((prev) => ({ ...prev, [key]: cleaned }));
    
    if (!cleaned) {
      setYearTabs((prev) => {
        const updated = [...prev];
        const month = updated[yearIndex].months[monthIndex];
        month.basePrice = null;
        month.adjustedPrice = null;
        return updated;
      });
      return;
    }
    
    // Converte para número (aceita tanto , quanto . como separador decimal)
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    
    if (!isNaN(parsed) && isFinite(parsed)) {
      setYearTabs((prev) => {
        const updated = [...prev];
        const month = updated[yearIndex].months[monthIndex];
        
        // Atualiza Preço Base
        month.basePrice = parsed;
        
        // Recalcula Preço Reajustado automaticamente com IPCA (apenas se tiver multiplicadores disponíveis)
        if (ipcaMultipliers.length > 0) {
          const multiplier = getIPCAMultiplierForMonth(ipcaMultipliers, monthYm);
          month.adjustedPrice = parsed * multiplier;
        } else {
          // Se não tiver IPCA, mantém o valor atual ou null
          month.adjustedPrice = month.adjustedPrice ?? null;
        }
        
        return updated;
      });
    }
  }, [ipcaMultipliers]);
  
  const handleBasePriceBlur = React.useCallback((yearIndex: number, monthIndex: number) => {
    const key = `${yearIndex}-${monthIndex}`;
    setEditingPrice((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  }, []);

  const handleAdjustedPriceChange = React.useCallback((yearIndex: number, monthIndex: number, value: string) => {
    const key = `${yearIndex}-${monthIndex}`;
    
    // Remove espaços e caracteres inválidos, mas mantém números, vírgula e ponto
    const cleaned = value.replace(/\s/g, '').replace(/[^0-9,.]/g, '');
    
    // Mantém o texto enquanto o usuário digita
    setEditingAdjustedPrice((prev) => ({ ...prev, [key]: cleaned }));
    
    if (!cleaned) {
      setYearTabs((prev) => {
        const updated = [...prev];
        const month = updated[yearIndex].months[monthIndex];
        month.adjustedPrice = null;
        return updated;
      });
      return;
    }
    
    // Converte para número (aceita tanto , quanto . como separador decimal)
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    
    if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0) {
      setYearTabs((prev) => {
        const updated = [...prev];
        const month = updated[yearIndex].months[monthIndex];
        month.adjustedPrice = parsed;
        return updated;
      });
    }
  }, []);
  
  const handleAdjustedPriceBlur = React.useCallback((yearIndex: number, monthIndex: number) => {
    const key = `${yearIndex}-${monthIndex}`;
    setEditingAdjustedPrice((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  }, []);

  const handleFillVolume = React.useCallback((yearIndex: number) => {
    const firstMonth = yearTabs[yearIndex].months[0];
    if (!firstMonth) return;
    
    // Verifica se tem volumeMWm ou volumeMWh para replicar
    const hasVolumeMWm = firstMonth.volumeMWm !== null;
    const hasVolumeMWh = firstMonth.volumeMWh !== null;
    
    if (!hasVolumeMWm && !hasVolumeMWh) return;
    
    const volumeMWmToFill = hasVolumeMWm ? firstMonth.volumeMWm : null;
    const volumeMWhToFill = hasVolumeMWh ? firstMonth.volumeMWh : null;
    
    setYearTabs((prev) => {
      const updated = [...prev];
      updated[yearIndex].months = updated[yearIndex].months.map((month) => {
        let volumeMWm = volumeMWmToFill;
        let volumeMWh = volumeMWhToFill;
        
        // Se estamos replicando volumeMWm, recalcula volumeMWh
        if (volumeMWm !== null) {
          const [year, monthNum] = month.ym.split('-').map(Number);
          const hours = getHoursInMonth(year, monthNum);
          volumeMWh = calculateVolumeMWh(volumeMWm, hours);
        }
        
        // Recalcula campos dependentes usando Flexibilidade Superior e Inferior do contrato
        const volumeSeasonalizedMWh = volumeMWh;
        const flexibilityMaxMWh = volumeMWh !== null ? calculateFlexibilityMax(volumeMWh, upperValue) : null;
        const flexibilityMinMWh = volumeMWh !== null ? calculateFlexibilityMin(volumeMWh, lowerValue) : null;
        
        return {
          ...month,
          volumeMWm,
          volumeMWh,
          volumeSeasonalizedMWh,
          flexibilityMaxMWh,
          flexibilityMinMWh,
        };
      });
      return updated;
    });
  }, [yearTabs, upperValue, lowerValue]);

  const handleFillPrice = React.useCallback((yearIndex: number) => {
    const firstMonth = yearTabs[yearIndex].months[0];
    if (!firstMonth || firstMonth.basePrice === null) return;
    
    const priceToFill = firstMonth.basePrice;
    setYearTabs((prev) => {
      const updated = [...prev];
      updated[yearIndex].months = updated[yearIndex].months.map((month) => {
        // Preenche o preço base
        const basePrice = priceToFill;
        
        // Recalcula o preço reajustado com IPCA (apenas se tiver multiplicadores disponíveis)
        let adjustedPrice = month.adjustedPrice ?? null;
        if (ipcaMultipliers.length > 0) {
          const multiplier = getIPCAMultiplierForMonth(ipcaMultipliers, month.ym);
          adjustedPrice = basePrice * multiplier;
        }
        
        return {
          ...month,
          basePrice,
          adjustedPrice,
        };
      });
      return updated;
    });
  }, [yearTabs, ipcaMultipliers]);

  const handleFillAllYears = React.useCallback((ipcaMultipliers: IPCAMultiplier[]) => {
    setYearTabs((prev) => {
      // Pega o primeiro mês da primeira aba para obter os valores a replicar
      if (prev.length === 0) return prev;
      const firstMonth = prev[0].months[0];
      if (!firstMonth) return prev;
      
      // Verifica se tem volumeMWm ou volumeMWh para replicar
      const hasVolumeMWm = firstMonth.volumeMWm !== null;
      const hasVolumeMWh = firstMonth.volumeMWh !== null;
      const hasPrice = firstMonth.basePrice !== null;
      
      // Se não tem nada para replicar, não faz nada
      if (!hasVolumeMWm && !hasVolumeMWh && !hasPrice) return prev;
      
      const volumeMWmToFill = hasVolumeMWm ? firstMonth.volumeMWm : null;
      const volumeMWhToFill = hasVolumeMWh ? firstMonth.volumeMWh : null;
      const priceToFill = hasPrice ? firstMonth.basePrice : null;
      
      const updated = [...prev];
      // Itera sobre todas as abas de anos
      updated.forEach((yearTab, yearIndex) => {
        updated[yearIndex].months = yearTab.months.map((month) => {
          // Preenche volume apenas se houver valor para replicar
          let volumeMWm = volumeMWmToFill !== null ? volumeMWmToFill : month.volumeMWm;
          let volumeMWh = volumeMWhToFill !== null ? volumeMWhToFill : month.volumeMWh;
          
          // Se estamos replicando volumeMWm, recalcula volumeMWh
          if (volumeMWmToFill !== null && volumeMWm !== null) {
            const [year, monthNum] = month.ym.split('-').map(Number);
            const hours = getHoursInMonth(year, monthNum);
            volumeMWh = calculateVolumeMWh(volumeMWm, hours);
          }
          
          // Recalcula campos dependentes usando Flexibilidade Superior e Inferior do contrato
          const volumeSeasonalizedMWh = volumeMWh;
          const flexibilityMaxMWh = volumeMWh !== null ? calculateFlexibilityMax(volumeMWh, upperValue) : null;
          const flexibilityMinMWh = volumeMWh !== null ? calculateFlexibilityMin(volumeMWh, lowerValue) : null;
          
          // Preenche o preço base apenas se houver valor para replicar
          const basePrice = priceToFill !== null ? priceToFill : month.basePrice;
          
          // Recalcula o preço reajustado com IPCA (apenas se tiver multiplicadores disponíveis)
          let adjustedPrice = month.adjustedPrice ?? null;
          if (ipcaMultipliers.length > 0 && basePrice !== null) {
            const multiplier = getIPCAMultiplierForMonth(ipcaMultipliers, month.ym);
            adjustedPrice = basePrice * multiplier;
          }
          
          return {
            ...month,
            volumeMWm,
            volumeMWh,
            volumeSeasonalizedMWh,
            flexibilityMaxMWh,
            flexibilityMinMWh,
            basePrice,
            adjustedPrice,
          };
        });
      });
      return updated;
    });
  }, [upperValue, lowerValue, ipcaMultipliers]);

  const handleSubmit = React.useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      
      // Converte yearTabs de volta para PricePeriods
      const periods = yearTabs.map((tab) => ({
        id: ensureRandomId(),
        start: `${tab.year}-01`,
        end: `${tab.year}-12`,
        defaultPrice: undefined,
        defaultVolume: null,
        defaultVolumeUnit: null,
        months: tab.months
          .filter((month) => 
            month.basePrice !== null || 
            month.volumeMWm !== null || 
            month.volumeMWh !== null ||
            month.volumeSeasonalizedMWh !== null
          )
          .map((month) => ({
            ym: month.ym,
            
            // Campos legados (compatibilidade)
            price: month.basePrice ?? 0,
            volume: month.volumeMWh ?? null,
            volumeUnit: month.volumeMWh !== null ? ('MWH' as const) : ('MW_MEDIO' as const),
            
            // Volumes completos
            hoursInMonth: month.hoursInMonth,
            volumeMWm: month.volumeMWm ?? null,
            volumeMWh: month.volumeMWh ?? null,
            volumeSeasonalizedMWh: month.volumeSeasonalizedMWh ?? null,
            
            // Flexibilidades (snapshot)
            flexibilityMaxMWh: month.flexibilityMaxMWh ?? null,
            flexibilityMinMWh: month.flexibilityMinMWh ?? null,
            
            // Preços
            basePrice: month.basePrice ?? null,
            // adjustedPrice não é salvo - será recalculado ao carregar
          })),
      })).filter((period) => period.months.length > 0);
      
      onSave({ periods });
      setIsSaved(true);
      
      // Auto-close após 1 segundo
      setTimeout(() => {
        onClose();
      }, 1000);
    },
    [yearTabs, onSave, onClose]
  );

  if (!open) return null;

  const activeYearTab = yearTabs[activeTab];

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-6 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-[95vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Preços por Período
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Configure volumes e preços mensais com reajuste automático por IPCA
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
          {/* Abas de Anos */}
          <div className="border-b border-slate-200 bg-slate-50/60 px-6 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex gap-2 overflow-x-auto">
              {yearTabs.map((tab, index) => (
                <button
                  key={tab.year}
                  type="button"
                  onClick={() => setActiveTab(index)}
                  className={`px-4 py-3 text-sm font-semibold transition border-b-2 ${
                    activeTab === index
                      ? 'border-yn-orange text-yn-orange'
                      : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.year}
                </button>
              ))}
            </div>
          </div>

          {isSaved && (
            <div className="mx-6 mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-200">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="font-semibold">Preços salvos com sucesso!</span>
              </div>
            </div>
          )}

          {isLoadingIPCA && (
            <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
              <Loader size={16} className="animate-spin" />
              <span>Carregando dados do IPCA para cálculo de reajuste...</span>
            </div>
          )}

          {!isLoadingIPCA && ipcaMultipliers.length === 0 && (
            <div className="mx-6 mt-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-700 dark:border-yellow-500/40 dark:bg-yellow-500/10 dark:text-yellow-200">
              <p className="font-semibold">⚠️ Dados do IPCA não disponíveis</p>
              <p className="mt-1 text-xs">
                Os preços reajustados não serão calculados automaticamente. Você pode inserir os preços reajustados manualmente na coluna "Preço Reaj. R$/MWh".
              </p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {activeYearTab && (
              <div className="space-y-4">
                {/* Botões de Preenchimento com explicação */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Ações Rápidas
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleFillVolume(activeTab)}
                      className="rounded-lg border border-yn-orange bg-white px-4 py-2 text-sm font-semibold text-yn-orange transition hover:bg-yn-orange hover:text-white dark:bg-slate-900 dark:hover:bg-yn-orange"
                    >
                      Preencher Volume Flat
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillPrice(activeTab)}
                      className="rounded-lg border border-yn-orange bg-white px-4 py-2 text-sm font-semibold text-yn-orange transition hover:bg-yn-orange hover:text-white dark:bg-slate-900 dark:hover:bg-yn-orange"
                    >
                      Preencher Preço Flat
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillAllYears(ipcaMultipliers)}
                      className="rounded-lg border border-yn-orange bg-white px-4 py-2 text-sm font-semibold text-yn-orange transition hover:bg-yn-orange hover:text-white dark:bg-slate-900 dark:hover:bg-yn-orange"
                    >
                      Preencher Volume e Preço Flat (Todos os Anos)
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Os dois primeiros botões replicam o primeiro valor preenchido para todos os meses do ano atual. O terceiro botão replica volume e preço para todos os meses de todas as abas de anos.
                  </p>
                </div>

                {/* Legenda e Parâmetros de Flexibilidade */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-blue-100 dark:bg-blue-900/40"></div>
                      <span className="text-slate-600 dark:text-slate-400">Campo editável</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-slate-100 dark:bg-slate-800"></div>
                      <span className="text-slate-600 dark:text-slate-400">Calculado automaticamente</span>
                    </div>
                  </div>
                  
                  {/* Parâmetros de Flexibilidade */}
                  <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Flexibilidade:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Superior</span>
                      <span className="rounded bg-green-100 px-2 py-1 text-sm font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                        +{upperValue}%
                      </span>
                    </div>
                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Inferior</span>
                      <span className="rounded bg-orange-100 px-2 py-1 text-sm font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                        -{lowerValue}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabela de Meses */}
                <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm dark:border-slate-800">
                  <table className="w-full min-w-[1400px] text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-900">
                      <tr>
                        <th className="sticky left-0 z-10 bg-slate-100 px-3 py-3 text-left font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          Mês
                        </th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-300" title="Quantidade de horas no mês">
                          Horas
                        </th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/20" title="Campo editável: Volume Contratado em MW médio">
                          Volume MWm ✏️
                        </th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/20" title="Campo editável: Pode ser calculado ou preenchido diretamente">
                          Volume MWh ✏️
                        </th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/20" title="Campo editável: Volume Sazonalizado">
                          Vol. Sazonal MWh ✏️
                        </th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-300" title="Vol. Sazonal × (1 + Flex. Superior%)">
                          Flex. Máx MWh
                        </th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-300" title="Vol. Sazonal × (1 - Flex. Inferior%)">
                          Flex. Mín MWh
                        </th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-300 bg-green-50 dark:bg-green-900/20" title="Campo editável: Preço base sem reajuste">
                          Preço Base R$/MWh ✏️
                        </th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-700 dark:text-slate-300" title="Preço Base × Multiplicador IPCA">
                          Preço Reaj. R$/MWh
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {activeYearTab.months.map((month, monthIndex) => {
                        const key = `${activeTab}-${monthIndex}`;
                        const isEditingVolumeMWm = key in editingVolumeMWm;
                        const isEditingVolumeMWh = key in editingVolumeMWh;
                        const isEditingVolumeSeasonal = key in editingVolumeSeasonal;
                        const isEditingPrice = key in editingPrice;
                        const isEditingAdjustedPrice = key in editingAdjustedPrice;
                        
                        return (
                          <tr key={month.ym} className="transition hover:bg-slate-50 dark:hover:bg-slate-900/50">
                            <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                              {formatMonthLabel(month.ym)}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                              {month.hoursInMonth}h
                            </td>
                            <td className="px-3 py-2 bg-blue-50/50 dark:bg-blue-900/10">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={
                                  isEditingVolumeMWm
                                    ? editingVolumeMWm[key]
                                    : month.volumeMWm !== null
                                    ? month.volumeMWm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : ''
                                }
                                onChange={(e) => handleVolumeMWmChange(activeTab, monthIndex, e.target.value, month.ym)}
                                onBlur={() => handleVolumeMWmBlur(activeTab, monthIndex)}
                                placeholder="0,00"
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-right text-sm tabular-nums focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                              />
                            </td>
                            <td className="px-3 py-2 bg-blue-50/50 dark:bg-blue-900/10">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={
                                  isEditingVolumeMWh
                                    ? editingVolumeMWh[key]
                                    : month.volumeMWh !== null
                                    ? month.volumeMWh.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : ''
                                }
                                onChange={(e) => handleVolumeMWhChange(activeTab, monthIndex, e.target.value, month.ym)}
                                onBlur={() => handleVolumeMWhBlur(activeTab, monthIndex)}
                                placeholder="0,00"
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-right text-sm tabular-nums focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                              />
                            </td>
                            <td className="px-3 py-2 bg-blue-50/50 dark:bg-blue-900/10">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={
                                  isEditingVolumeSeasonal
                                    ? editingVolumeSeasonal[key]
                                    : month.volumeSeasonalizedMWh !== null
                                    ? month.volumeSeasonalizedMWh.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : ''
                                }
                                onChange={(e) => handleVolumeSeasonalChange(activeTab, monthIndex, e.target.value)}
                                onBlur={() => handleVolumeSeasonalBlur(activeTab, monthIndex)}
                                placeholder="0,00"
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-right text-sm tabular-nums focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                              />
                            </td>
                          <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                            {month.flexibilityMaxMWh !== null ? month.flexibilityMaxMWh.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                            {month.flexibilityMinMWh !== null ? month.flexibilityMinMWh.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </td>
                            <td className="px-3 py-2 bg-green-50/50 dark:bg-green-900/10">
                              <div className="relative">
                                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    isEditingPrice
                                      ? editingPrice[key]
                                      : month.basePrice !== null
                                      ? month.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                      : ''
                                  }
                                  onChange={(e) => handleBasePriceChange(activeTab, monthIndex, e.target.value, month.ym)}
                                  onBlur={() => handleBasePriceBlur(activeTab, monthIndex)}
                                  placeholder="0,00"
                                  className="w-full rounded border border-slate-300 bg-white pl-8 pr-2 py-1.5 text-right text-sm tabular-nums focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-slate-700 dark:bg-slate-950"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                              <div className="relative">
                                {isEditingAdjustedPrice ? (
                                  <input
                                    type="text"
                                    value={editingAdjustedPrice[key]}
                                    onChange={(e) => handleAdjustedPriceChange(activeTab, monthIndex, e.target.value)}
                                    onBlur={() => handleAdjustedPriceBlur(activeTab, monthIndex)}
                                    placeholder="0,00"
                                    className="w-full rounded border border-blue-300 bg-blue-50 pl-2 pr-2 py-1.5 text-right text-sm tabular-nums focus:border-yn-orange focus:outline-none focus:ring-2 focus:ring-yn-orange/40 dark:border-blue-700 dark:bg-blue-900/20"
                                  />
                                ) : (
                                  <div
                                    onClick={() => setEditingAdjustedPrice((prev) => ({ ...prev, [key]: month.adjustedPrice !== null ? month.adjustedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '' }))}
                                    className="cursor-pointer rounded border border-transparent px-2 py-1.5 hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-700 dark:hover:bg-blue-900/20"
                                    title="Clique para editar manualmente"
                                  >
                                    {month.adjustedPrice !== null ? formatCurrencyBRL(month.adjustedPrice) : '-'}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
              disabled={isSaved}
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
