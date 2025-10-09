import { AuthUser, Contract } from './api';

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
  throw new Error(`No mock for ${path}`);
}
