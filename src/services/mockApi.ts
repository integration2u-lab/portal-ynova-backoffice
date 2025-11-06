import { AuthUser, Contract } from './api';
import { EnergyBalanceApiResponse } from './energyBalance';

let fakeUser: AuthUser | null = null;

const mockContracts: Contract[] = Array.from({ length: 20 }).map((_, i) => {
  const start = new Date(2024, i % 12, 1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 24);
  const toIsoString = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  const randomId = typeof globalThis !== 'undefined'
    && typeof globalThis.crypto !== 'undefined'
    && 'randomUUID' in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `client-${i + 1}`;

  return {
    id: String(i + 1),
    contract_code: `CTR-2024-${String(i + 1).padStart(3, '0')}`,
    client_id: randomId,
    corporate_name: `Razão Social Cliente ${i + 1}`,
    client_name: `Cliente ${i + 1}`,
    groupName: 'default',
    cnpj: `00.000.000/000${i % 10}-0${i % 10}`,
    segment: i % 2 === 0 ? 'Comercial' : 'Industrial',
    contact_responsible: i % 2 === 0 ? 'Maria Silva' : 'João Souza',
    contracted_volume_mwh: (1200 + i * 50).toFixed(2),
    status: i % 3 === 0 ? 'Ativo' : i % 3 === 1 ? 'Em análise' : 'Inativo',
    energy_source: i % 2 === 0 ? 'Convencional' : 'Renovável',
    contracted_modality: i % 2 === 0 ? 'PLD' : 'Tarifa Fixa',
    start_date: toIsoString(start),
    end_date: toIsoString(end),
    billing_cycle: 'Mensal',
    upper_limit_percent: '0.15',
    lower_limit_percent: '0.05',
    flexibility_percent: '0.10',
    average_price_mwh: '320.50',
    spot_price_ref_mwh: '299.90',
    compliance_consumption: 'Em análise',
    compliance_nf: 'Em análise',
    compliance_invoice: 'Em análise',
    compliance_charges: 'Em análise',
    compliance_overall: 'Em análise',
    created_at: toIsoString(new Date()),
    updated_at: toIsoString(new Date()),
  };
});

// Mock Energy Balance data
const mockEnergyBalance: EnergyBalanceApiResponse[] = [
  {
    id: "351",
    clientName: "UPB UNIAO MUNICIPIOS BAHIA",
    price: 195.00,
    referenceBase: "2025-07-01T00:00:00.000Z",
    supplier: "Boven",
    meter: "BAHMERENTR101 (L)",
    consumptionKwh: "8.707591",
    proinfaContribution: "0",
    contract: "16.378",
    minDemand: 0.000,
    maxDemand: 32.757,
    cpCode: null,
    createdAt: "2025-07-01T00:00:00.000Z",
    updatedAt: "2025-10-10T17:22:57.685Z",
    clientId: "798d6fed-a4cd-4687-8407-3bd318868ef1",
    contractId: "1",
    contactActive: true,
    billable: 1698.00,
    adjusted: false
  },
  {
    id: "352",
    clientName: "UPB UNIAO MUNICIPIOS BAHIA",
    price: 207.73,
    referenceBase: "2025-06-01T00:00:00.000Z",
    supplier: "Boven",
    meter: "BAHMERENTR101 (L)",
    consumptionKwh: "6.112000",
    proinfaContribution: "0.219",
    contract: "16.378",
    minDemand: 0.000,
    maxDemand: 32.757,
    cpCode: null,
    createdAt: "2025-06-01T00:00:00.000Z",
    updatedAt: "2025-10-10T17:22:57.685Z",
    clientId: "798d6fed-a4cd-4687-8407-3bd318868ef1",
    contractId: "1",
    contactActive: true,
    billable: 1269.00,
    adjusted: false
  },
  {
    id: "353",
    clientName: "UPB UNIAO MUNICIPIOS BAHIA",
    price: 210.50,
    referenceBase: "2025-05-01T00:00:00.000Z",
    supplier: "Boven",
    meter: "BAHMERENTR101 (L)",
    consumptionKwh: "5.890000",
    proinfaContribution: "0.200",
    contract: "16.378",
    minDemand: 0.000,
    maxDemand: 32.757,
    cpCode: null,
    createdAt: "2025-05-01T00:00:00.000Z",
    updatedAt: "2025-10-10T17:22:57.685Z",
    clientId: "798d6fed-a4cd-4687-8407-3bd318868ef1",
    contractId: "1",
    contactActive: true,
    billable: 1240.00,
    adjusted: true
  }
];

export async function mockFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  await new Promise((r) => setTimeout(r, 150));
  // Very naive router
  if (path.startsWith('/auth/csrf')) {
    // set a dummy cookie so headers include it later
    document.cookie = `csrf_token=fake_csrf; path=/`;
    return undefined as unknown as T;
  }
  if (path.startsWith('/auth/me')) {
    if (!fakeUser) throw new Error('Unauthenticated');
    return fakeUser as unknown as T;
  }
  if (path.startsWith('/auth/login') && options.method === 'POST') {
    const body = options.body ? JSON.parse(options.body as string) : {};
    if (body.email && body.password) {
      fakeUser = {
        id: 'u1',
        email: body.email,
        name: 'Gestora Ynova',
        roles: ['gestora'],
        permissions: ['contracts:read'],
      };
      return fakeUser as unknown as T;
    }
    throw new Error('Invalid credentials');
  }
  if (path.startsWith('/auth/logout') && options.method === 'POST') {
    fakeUser = null;
    return undefined as unknown as T;
  }
  if (path.startsWith('/auth/refresh') && options.method === 'POST') {
    if (!fakeUser) throw new Error('No session');
    return fakeUser as unknown as T;
  }
  if (path.startsWith('/auth/forgot-password') && options.method === 'POST') {
    return undefined as unknown as T;
  }
  if (path.startsWith('/contracts')) {
    return mockContracts as unknown as T;
  }
  if (path.startsWith('/energy-balance')) {
    // Filter by contract_id if provided
    const url = new URL(path, 'http://localhost');
    const contractId = url.searchParams.get('contract_id');
    
    if (contractId) {
      const filteredData = mockEnergyBalance.filter(item => item.contractId === contractId);
      return filteredData as unknown as T;
    }
    
    return mockEnergyBalance as unknown as T;
  }
  if (path.startsWith('/api/dashboard/overview')) {
    return {
      totalContratosAtivos: 15,
      distribuicaoConformidade: {
        Subutilizado: 3,
        Conforme: 8,
        Excedente: 2,
        Indefinido: 2
      },
      totalOportunidades: 5,
      totalDivergenciasNF: 2,
      totalDivergenciasFatura: 1
    } as unknown as T;
  }
  if (path.startsWith('/api/dashboard/inteligencia')) {
    return {
      demanda: { verde: 8, amarelo: 3, vermelho: 2 },
      modalidade_tarifaria: { verde: 10, amarelo: 2, vermelho: 1 },
      energia_reativa: { verde: 7, amarelo: 4, vermelho: 2 },
      contrato: { verde: 9, amarelo: 3, vermelho: 1 }
    } as unknown as T;
  }
  if (path.startsWith('/api/dashboard/conformidades')) {
    return {
      nf_divergentes: [
        {
          id: "nf1",
          numero: "NF-001",
          cliente: "Cliente A",
          status_nf: { energia: "Divergente", icms: "Conforme" },
          valores_nf: { valor_energia: 1500.50, valor_icms: 300.10 },
          observacao: "Divergência na energia"
        }
      ],
      fatura_divergentes: [
        {
          id: "fat1",
          numero: "FAT-001",
          cliente: "Cliente B",
          status_fatura: { demanda: "Divergente", tusd: "Conforme", icms: "Conforme" },
          regra_tolerancia_demanda: 1.05,
          observacao: "Divergência na demanda"
        }
      ]
    } as unknown as T;
  }
  if (path.startsWith('/api/contratos')) {
    // Return mock contracts data for dashboard
    return {
      contratos: mockContracts.slice(0, 10).map(contract => ({
        ...contract,
        consumo_contrato: {
          consumo_acumulado: Math.random() * 1000,
          limite_superior: 800,
          diferenca_percentual_vs_limite: Math.random() * 20 - 10
        },
        observacao_oportunidade: "Oportunidade de otimização identificada"
      })),
      paginacao: { total: 10, page: 1, pageSize: 10 }
    } as unknown as T;
  }
  throw new Error(`No mock for ${path}`);
}
