export interface EnergyBalanceListItem {
  id: string;
  cliente: string;
  cnpj: string;
  meterCode: string;
  impostoPercent: string;
  consumoKWh: string;
  geracaoKWh: string;
  saldoKWh: string;
  saldoValor?: number | null;
}

export interface EnergyBalanceDetailMetrics {
  consumoTotalMWh: string;
  custoTotalBRL: string;
  proinfaTotal: string;
  economiaPotencialBRL: string;
}

export interface EnergyBalanceDetailHeader {
  titleSuffix: string;
  razao: string;
  cnpj: string;
  contractId?: string;
  contractCode?: string;
}

export interface EnergyBalanceDetailMonthRow {
  id: string;
  mes: string;
  medidor: string;
  consumoMWh: string;
  precoReaisPorMWh: string;
  custoMesBRL: string;
  proinfa: string;
  faixaContratual: string;
  ajustado: string;
  fornecedor: string;
  contrato: string;
  codigoCP: string;
  dataCriacao: string;
  dataAtualizacao: string;
  contatoAtivo: string;
  actions?: string;
}

export interface EnergyBalanceDetail {
  header: EnergyBalanceDetailHeader;
  metrics: EnergyBalanceDetailMetrics;
  months: EnergyBalanceDetailMonthRow[];
}

export interface EnergyBalanceEvent {
  id: string;
  title: string;
  description: string;
  user: string;
  createdAt: string;
}
