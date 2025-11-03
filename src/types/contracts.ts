import type {
  AnaliseArea,
  AnaliseStatus,
  ContractInfoField,
  ContractInvoice,
  ContractInvoiceStatus,
  ContractMock,
  ConsumoHistorico,
  DemandaHistorico,
  KPIItem,
  ObrigacaoRow,
  StatusResumo,
} from '../mocks/contracts';
import type { ContractPriceMonth, ContractPricePeriod, ContractPricePeriods } from './pricePeriods';
import type { PricePeriodsSummary } from '../utils/contractPricing';

export { summarizePricePeriods, normalizeAnnualPricePeriods, calculateAdjustedPriceDifference } from '../utils/contractPricing';

export type ContractDetails = ContractMock;

export type {
  AnaliseArea,
  AnaliseStatus,
  ContractInfoField,
  ContractInvoice,
  ContractInvoiceStatus,
  ConsumoHistorico,
  DemandaHistorico,
  KPIItem,
  ObrigacaoRow,
  StatusResumo,
  ContractVolumeByYear,
};

export { formatMesLabel, obrigacaoColunas } from '../mocks/contracts';
