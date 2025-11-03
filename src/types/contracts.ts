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
