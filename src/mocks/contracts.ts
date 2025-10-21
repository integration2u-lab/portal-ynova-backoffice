export type StatusResumo = 'Conforme' | 'Divergente' | 'Em análise';
export type AnaliseStatus = 'verde' | 'amarelo' | 'vermelho';

export type KPIItem = {
  label: string;
  value: string;
  helper?: string;
  variation?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
};

export type ContractInfoField = {
  label: string;
  value: string;
};

export type DemandaHistorico = {
  mes: string;
  ponta: number;
  foraPonta: number;
};

export type ConsumoHistorico = {
  mes: string;
  meta: number;
  realizado: number;
};

export type ObrigacaoRow = {
  periodo: string;
  status: Record<string, StatusResumo>;
};

export type AnaliseArea = {
  area: string;
  etapas: Array<{
    nome: 'Dados' | 'Cálculo' | 'Análise';
    status: AnaliseStatus;
    observacao?: string;
  }>;
};

export type ContractInvoiceStatus = 'Paga' | 'Em aberto' | 'Em análise';

export type ContractInvoice = {
  id: string;
  competencia: string; // YYYY-MM
  vencimento: string; // YYYY-MM-DD
  valor: number;
  status: ContractInvoiceStatus;
  arquivo?: string;
};

export type ContractMock = {
  id: string;
  codigo: string;
  cliente: string;
  cnpj: string;
  segmento: string;
  contato: string;
  status: 'Ativo' | 'Inativo';
  fonte: 'Convencional' | 'Incentivada' | 'Incentivada 0%' | 'Incentivada 50%' | 'Incentivada 100%';
  modalidade: string;
  inicioVigencia: string;
  fimVigencia: string;
  limiteSuperior: string;
  limiteInferior: string;
  flex: string;
  precoMedio: number;
  precosMedios?: number[];
  fornecedor: string;
  proinfa: number | null;
  cicloFaturamento: string;
  periodos: string[]; // YYYY-MM
  resumoConformidades: Record<'Consumo' | 'NF' | 'Fatura' | 'Encargos' | 'Conformidade', StatusResumo>;
  kpis: KPIItem[];
  dadosContrato: ContractInfoField[];
  historicoDemanda: DemandaHistorico[];
  historicoConsumo: ConsumoHistorico[];
  obrigacoes: ObrigacaoRow[];
  analises: AnaliseArea[];
  faturas: ContractInvoice[];
};

const meses = ['2023-12', '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06'];

const baseObrigacoesCols = [
  'Consumo',
  'NF',
  'Fatura',
  'Encargos',
  'Conformidade',
  'Divergências',
  'Projeções',
  'Riscos',
  'Liquidação',
  'Pagamentos',
  'Preços',
  'Flex',
  'Limites',
  'Documentos',
  'Observações',
];

const obrigacoesRow = (periodo: string, statuses: StatusResumo[]): ObrigacaoRow => ({
  periodo,
  status: baseObrigacoesCols.reduce<Record<string, StatusResumo>>((acc, col, index) => {
    acc[col] = statuses[index] ?? 'Conforme';
    return acc;
  }, {}),
});

export const obrigacaoColunas = ['Período', ...baseObrigacoesCols];

export const mockContracts: ContractMock[] = [
  {
    id: 'US-11',
    codigo: 'US-11',
    cliente: 'UniSolar Energia',
    cnpj: '12.345.678/0001-90',
    segmento: 'Indústria Automotiva',
    contato: 'Mariana Figueiredo',
    status: 'Ativo',
    fonte: 'Convencional',
    modalidade: 'PLD Horário',
    inicioVigencia: '2023-07-01',
    fimVigencia: '2025-06-30',
    limiteSuperior: '105%',
    limiteInferior: '95%',
    flex: '5%',
    precoMedio: 274.32,
    fornecedor: 'Neoenergia Comercializadora',
    proinfa: 0.219,
    cicloFaturamento: '2024-06',
    periodos: meses.slice(1),
    resumoConformidades: {
      Consumo: 'Conforme',
      NF: 'Em análise',
      Fatura: 'Conforme',
      Encargos: 'Conforme',
      Conformidade: 'Em análise',
    },
    kpis: [
      { label: 'Consumo acumulado', value: '18.420 MWh', helper: 'Jan-Jun/2024' },
      { label: 'Receita Prevista', value: 'R$ 5.9 mi', variation: { value: '+3,8%', direction: 'up' } },
      { label: 'Economia vs Cativo', value: 'R$ 1.2 mi', variation: { value: '+12%', direction: 'up' } },
      { label: 'Variação mensal', value: 'R$ 312 mil', variation: { value: '-1,5%', direction: 'down' } },
    ],
    dadosContrato: [
      { label: 'Fornecedor', value: 'Neoenergia Comercializadora' },
      { label: 'Proinfa', value: '0,219' },
      { label: 'Vigência', value: 'Jul/2023 - Jun/2025' },
      { label: 'Modalidade', value: 'Preço Fixo com Ajuste PLD' },
      { label: 'Fonte', value: 'Convencional' },
      { label: 'Volume Contratado', value: '3.200 MWh/mês' },
      { label: 'Flex / Limites', value: '±5% (95% - 105%)' },
      { label: 'Preço Médio', value: 'R$ 274,32 / MWh' },
      { label: 'Centro de Custo', value: 'Unidade Industrial SP' },
      { label: 'Responsável', value: 'Mariana Figueiredo' },
    ],
    historicoDemanda: meses.slice(2).map((mes, index) => ({
      mes,
      ponta: 420 + index * 12,
      foraPonta: 310 + index * 15,
    })),
    historicoConsumo: meses.slice(2).map((mes, index) => ({
      mes,
      meta: 3200,
      realizado: 3100 + (index % 2 === 0 ? 80 : -120),
    })),
    obrigacoes: [
      obrigacoesRow('Fev/2024', [
        'Conforme',
        'Em análise',
        'Conforme',
        'Conforme',
        'Em análise',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
      ]),
      obrigacoesRow('Mar/2024', [
        'Conforme',
        'Divergente',
        'Conforme',
        'Conforme',
        'Divergente',
        'Em análise',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Em análise',
        'Conforme',
        'Conforme',
        'Conforme',
        'Em análise',
      ]),
      obrigacoesRow('Abr/2024', [
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Em análise',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
      ]),
    ],
    analises: [
      {
        area: 'Consumo',
        etapas: [
          { nome: 'Dados', status: 'verde' },
          { nome: 'Cálculo', status: 'amarelo', observacao: 'Aguardando medição da distribuidora' },
          { nome: 'Análise', status: 'amarelo' },
        ],
      },
      {
        area: 'NF',
        etapas: [
          { nome: 'Dados', status: 'verde' },
          { nome: 'Cálculo', status: 'verde' },
          { nome: 'Análise', status: 'vermelho', observacao: 'Diferença ICMS em revisão' },
        ],
      },
      {
        area: 'Fatura',
        etapas: [
          { nome: 'Dados', status: 'verde' },
          { nome: 'Cálculo', status: 'verde' },
          { nome: 'Análise', status: 'verde' },
        ],
      },
      {
        area: 'Encargos',
        etapas: [
          { nome: 'Dados', status: 'amarelo' },
          { nome: 'Cálculo', status: 'amarelo', observacao: 'Verificando ajustes MCP' },
          { nome: 'Análise', status: 'verde' },
        ],
      },
    ],
    faturas: [
      {
        id: 'US-11-2024-04',
        competencia: '2024-04',
        vencimento: '2024-05-12',
        valor: 892300.5,
        status: 'Paga',
        arquivo: '#',
      },
      {
        id: 'US-11-2024-05',
        competencia: '2024-05',
        vencimento: '2024-06-12',
        valor: 905120.75,
        status: 'Em análise',
      },
      {
        id: 'US-11-2024-06',
        competencia: '2024-06',
        vencimento: '2024-07-12',
        valor: 918430.9,
        status: 'Em aberto',
      },
    ],
  },
  {
    id: 'BR-04',
    codigo: 'BR-04',
    cliente: 'Brasil Foods LTDA',
    cnpj: '98.765.432/0001-10',
    segmento: 'Alimentos',
    contato: 'Renato Magalhães',
    status: 'Ativo',
    fonte: 'Incentivada',
    modalidade: 'Desconto TUSD Verde',
    inicioVigencia: '2022-01-01',
    fimVigencia: '2024-12-31',
    limiteSuperior: '110%',
    limiteInferior: '92%',
    flex: '8%',
    precoMedio: 219.5,
    fornecedor: 'Raízen Energia',
    proinfa: 0.185,
    cicloFaturamento: '2024-05',
    periodos: meses.slice(0, 6),
    resumoConformidades: {
      Consumo: 'Conforme',
      NF: 'Conforme',
      Fatura: 'Em análise',
      Encargos: 'Conforme',
      Conformidade: 'Conforme',
    },
    kpis: [
      { label: 'Consumo acumulado', value: '14.760 MWh', helper: 'Jan-Mai/2024' },
      { label: 'Receita Prevista', value: 'R$ 4.4 mi', variation: { value: '+1,2%', direction: 'up' } },
      { label: 'Economia vs Cativo', value: 'R$ 980 mil', variation: { value: '+6,3%', direction: 'up' } },
      { label: 'Variação mensal', value: 'R$ 214 mil', variation: { value: '+0,4%', direction: 'neutral' } },
    ],
    dadosContrato: [
      { label: 'Fornecedor', value: 'Raízen Energia' },
      { label: 'Proinfa', value: '0,185' },
      { label: 'Vigência', value: 'Jan/2022 - Dez/2024' },
      { label: 'Modalidade', value: 'TUSD Verde' },
      { label: 'Fonte', value: 'Incentivada' },
      { label: 'Volume Contratado', value: '2.450 MWh/mês' },
      { label: 'Flex / Limites', value: '±8% (92% - 110%)' },
      { label: 'Preço Médio', value: 'R$ 219,50 / MWh' },
      { label: 'Centro de Custo', value: 'Planta RS' },
      { label: 'Responsável', value: 'Renato Magalhães' },
    ],
    historicoDemanda: meses.slice(1, 6).map((mes, index) => ({
      mes,
      ponta: 280 + index * 9,
      foraPonta: 210 + index * 6,
    })),
    historicoConsumo: meses.slice(1, 6).map((mes, index) => ({
      mes,
      meta: 2450,
      realizado: 2400 + (index % 3 === 0 ? 60 : -70),
    })),
    obrigacoes: [
      obrigacoesRow('Jan/2024', [
        'Conforme',
        'Conforme',
        'Em análise',
        'Conforme',
        'Em análise',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Em análise',
        'Conforme',
        'Conforme',
        'Conforme',
      ]),
      obrigacoesRow('Fev/2024', [
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Em análise',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
      ]),
      obrigacoesRow('Mar/2024', [
        'Em análise',
        'Conforme',
        'Em análise',
        'Conforme',
        'Em análise',
        'Em análise',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Em análise',
        'Conforme',
        'Conforme',
        'Em análise',
      ]),
    ],
    analises: [
      {
        area: 'Consumo',
        etapas: [
          { nome: 'Dados', status: 'verde' },
          { nome: 'Cálculo', status: 'verde' },
          { nome: 'Análise', status: 'verde' },
        ],
      },
      {
        area: 'NF',
        etapas: [
          { nome: 'Dados', status: 'verde' },
          { nome: 'Cálculo', status: 'verde' },
          { nome: 'Análise', status: 'verde' },
        ],
      },
      {
        area: 'Fatura',
        etapas: [
          { nome: 'Dados', status: 'amarelo' },
          { nome: 'Cálculo', status: 'amarelo', observacao: 'Recalculando demanda contratada' },
          { nome: 'Análise', status: 'amarelo' },
        ],
      },
      {
        area: 'Encargos',
        etapas: [
          { nome: 'Dados', status: 'verde' },
          { nome: 'Cálculo', status: 'verde' },
          { nome: 'Análise', status: 'verde' },
        ],
      },
    ],
    faturas: [
      {
        id: 'BR-04-2024-03',
        competencia: '2024-03',
        vencimento: '2024-04-08',
        valor: 642180.4,
        status: 'Paga',
      },
      {
        id: 'BR-04-2024-04',
        competencia: '2024-04',
        vencimento: '2024-05-08',
        valor: 658912.32,
        status: 'Paga',
      },
      {
        id: 'BR-04-2024-05',
        competencia: '2024-05',
        vencimento: '2024-06-08',
        valor: 671204.11,
        status: 'Em análise',
      },
    ],
  },
  {
    id: 'MG-21',
    codigo: 'MG-21',
    cliente: 'Minas Gusa Siderurgia',
    cnpj: '45.908.321/0001-05',
    segmento: 'Siderurgia',
    contato: 'Larissa Campos',
    status: 'Ativo',
    fonte: 'Convencional',
    modalidade: 'Preço Fixo',
    inicioVigencia: '2024-01-01',
    fimVigencia: '2026-12-31',
    limiteSuperior: '108%',
    limiteInferior: '93%',
    flex: '7%',
    precoMedio: 252.9,
    fornecedor: 'Brookfield Energia',
    proinfa: null,
    cicloFaturamento: '2024-06',
    periodos: meses.slice(2),
    resumoConformidades: {
      Consumo: 'Em análise',
      NF: 'Conforme',
      Fatura: 'Conforme',
      Encargos: 'Em análise',
      Conformidade: 'Em análise',
    },
    kpis: [
      { label: 'Consumo acumulado', value: '9.870 MWh', helper: 'Jan-Jun/2024' },
      { label: 'Receita Prevista', value: 'R$ 3.1 mi', variation: { value: '+2,1%', direction: 'up' } },
      { label: 'Economia vs Cativo', value: 'R$ 640 mil', variation: { value: '+4,4%', direction: 'up' } },
      { label: 'Variação mensal', value: 'R$ 198 mil', variation: { value: '+0,8%', direction: 'up' } },
    ],
    dadosContrato: [
      { label: 'Fornecedor', value: 'Brookfield Energia' },
      { label: 'Proinfa', value: 'Não informado' },
      { label: 'Vigência', value: 'Jan/2024 - Dez/2026' },
      { label: 'Modalidade', value: 'Preço Fixo' },
      { label: 'Fonte', value: 'Convencional' },
      { label: 'Volume Contratado', value: '1.650 MWh/mês' },
      { label: 'Flex / Limites', value: '±7% (93% - 108%)' },
      { label: 'Preço Médio', value: 'R$ 252,90 / MWh' },
      { label: 'Centro de Custo', value: 'Planta MG' },
      { label: 'Responsável', value: 'Larissa Campos' },
    ],
    historicoDemanda: meses.slice(2).map((mes, index) => ({
      mes,
      ponta: 190 + index * 7,
      foraPonta: 150 + index * 10,
    })),
    historicoConsumo: meses.slice(2).map((mes, index) => ({
      mes,
      meta: 1650,
      realizado: 1600 + (index % 2 === 0 ? -40 : 70),
    })),
    obrigacoes: [
      obrigacoesRow('Fev/2024', [
        'Em análise',
        'Conforme',
        'Conforme',
        'Em análise',
        'Em análise',
        'Em análise',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Em análise',
        'Conforme',
        'Conforme',
        'Conforme',
      ]),
      obrigacoesRow('Mar/2024', [
        'Em análise',
        'Conforme',
        'Conforme',
        'Em análise',
        'Em análise',
        'Em análise',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Em análise',
        'Conforme',
        'Conforme',
        'Conforme',
        'Em análise',
      ]),
      obrigacoesRow('Abr/2024', [
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Em análise',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
        'Conforme',
      ]),
    ],
    analises: [
      {
        area: 'Consumo',
        etapas: [
          { nome: 'Dados', status: 'amarelo', observacao: 'Medição parcial recebida' },
          { nome: 'Cálculo', status: 'amarelo' },
          { nome: 'Análise', status: 'amarelo' },
        ],
      },
      {
        area: 'NF',
        etapas: [
          { nome: 'Dados', status: 'verde' },
          { nome: 'Cálculo', status: 'verde' },
          { nome: 'Análise', status: 'verde' },
        ],
      },
      {
        area: 'Fatura',
        etapas: [
          { nome: 'Dados', status: 'verde' },
          { nome: 'Cálculo', status: 'verde' },
          { nome: 'Análise', status: 'verde' },
        ],
      },
      {
        area: 'Encargos',
        etapas: [
          { nome: 'Dados', status: 'amarelo' },
          { nome: 'Cálculo', status: 'amarelo', observacao: 'Ajuste GFOM' },
          { nome: 'Análise', status: 'vermelho', observacao: 'Pendências MCP' },
        ],
      },
    ],
    faturas: [
      {
        id: 'MG-21-2024-03',
        competencia: '2024-03',
        vencimento: '2024-04-15',
        valor: 472890.5,
        status: 'Paga',
      },
      {
        id: 'MG-21-2024-04',
        competencia: '2024-04',
        vencimento: '2024-05-15',
        valor: 489120.1,
        status: 'Em aberto',
      },
      {
        id: 'MG-21-2024-05',
        competencia: '2024-05',
        vencimento: '2024-06-15',
        valor: 501432.44,
        status: 'Em análise',
      },
    ],
  },
];

export function formatMesLabel(periodo: string) {
  const [ano, mes] = periodo.split('-').map(Number);
  if (!ano || !mes) return periodo;
  return new Date(ano, mes - 1).toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric',
  });
}
