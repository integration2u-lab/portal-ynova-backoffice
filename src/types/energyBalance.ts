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
  sentOk?: boolean | null;
  referenceBaseLabel?: string;
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
  // Novos campos para compatibilidade com a tabela de emails
  perdas3?: string;
  requisito?: string;
  net?: string;
  medicao?: string;
  minimo?: string;
  maximo?: string;
  faturar?: string;
  email?: string;
  envioOk?: string;
  disparo?: string;
  dataVencimentoBoleto?: string;
}

export interface EnergyBalanceDetail {
  header: EnergyBalanceDetailHeader;
  metrics: EnergyBalanceDetailMetrics;
  months: EnergyBalanceDetailMonthRow[];
  cliente: string;
  statusMeasurement?: string | null;
}

export interface EnergyBalanceEvent {
  id: string;
  title: string;
  description: string;
  user: string;
  createdAt: string;
}
