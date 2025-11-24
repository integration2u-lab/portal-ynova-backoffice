export type VolumeUnit = 'MWH' | 'MW_MEDIO';

/**
 * Dados de um mês específico dentro de um período de preços
 * Inclui volumes, flexibilidades e preços (base e reajustado)
 */
export type ContractPriceMonth = {
  ym: string; // YYYY-MM
  
  // Campos originais (mantidos para compatibilidade)
  price?: number | null;
  volume?: number | null;
  volumeUnit?: VolumeUnit | null;
  
  // Campos para a tabela completa (salvos no JSON)
  hoursInMonth?: number; // Número de horas no mês (calculado: dias × 24)
  volumeMWm?: number | null; // Volume Contratado em MW médio (input manual)
  volumeMWh?: number | null; // Volume Contratado em MWh (input manual ou calculado)
  volumeSeasonalizedMWh?: number | null; // Volume Sazonalizado em MWh (editável)
  flexibilityMaxMWh?: number | null; // Flexibilidade Máxima em MWh (calculado)
  flexibilityMinMWh?: number | null; // Flexibilidade Mínima em MWh (calculado)
  basePrice?: number | null; // Preço base R$/MWh (input manual)
  adjustedPrice?: number | null; // Preço reajustado R$/MWh (recalculado ao carregar)
};

export type ContractPricePeriod = {
  id: string;
  start: string; // YYYY-MM
  end: string; // YYYY-MM
  defaultPrice?: number | null;
  defaultVolume?: number | null;
  defaultVolumeUnit?: VolumeUnit | null;
  months: ContractPriceMonth[];
};

export type ContractPricePeriods = {
  periods: ContractPricePeriod[];
};

/**
 * Estrutura de dados para uma aba de ano no modal de preços por período
 */
export type YearTab = {
  year: number;
  months: MonthRow[];
};

/**
 * Linha de dados de um mês na tabela do modal
 */
export type MonthRow = {
  ym: string; // YYYY-MM
  hoursInMonth: number; // calculado automaticamente (dias × 24)
  volumeMWm: number | null; // input manual
  volumeMWh: number | null; // calculado (volumeMWm × horas)
  volumeSeasonalizedMWh: number | null; // replica volumeMWh
  flexibilityMaxMWh: number | null; // calculado
  flexibilityMinMWh: number | null; // calculado
  basePrice: number | null; // input manual
  adjustedPrice: number | null; // calculado (basePrice × IPCA multiplier)
};
