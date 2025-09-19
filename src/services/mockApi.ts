import { AuthUser, Paged, ContractSummary, ContractsQuery } from './api';

let fakeUser: AuthUser | null = null;

const mockContracts: ContractSummary[] = Array.from({ length: 57 }).map((_, i) => {
  const ciclo = `2025-${String(((i % 12) + 1)).padStart(2, '0')}`;
  const energiaContratadaMWh = 100 + (i % 10) * 10;
  const energiaUtilizadaMWh = 80 + (i % 12) * 12;
  const flex = 10 + (i % 5) * 5; // percent
  const excedente = Math.max(0, energiaUtilizadaMWh - energiaContratadaMWh * (1 + flex / 100));
  const custoExtra = excedente * 250; // placeholder for PLD-integrated calc
  return {
    id: String(i + 1),
    cliente: `Cliente ${i + 1}`,
    cnpj: `12.345.678/000${(i % 10)}-9${(i % 10)}`,
    uc: `UC${1000 + i}`,
    status: (i % 3 === 0 ? 'ativo' : i % 3 === 1 ? 'pendente' : 'inativo') as any,
    ciclo,
    energiaContratadaMWh,
    energiaUtilizadaMWh,
    flexibilidadePct: flex,
    excedenteMWh: Number(excedente.toFixed(2)),
    custoExtra: Number(custoExtra.toFixed(2)),
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
    const qs = new URLSearchParams(path.split('?')[1] || '');
    const page = Number(qs.get('page') || 1);
    const pageSize = Number(qs.get('pageSize') || 10);
    const search = (qs.get('search') || '').toLowerCase();
    const startDate = qs.get('startDate') || '';
    const endDate = qs.get('endDate') || '';
    const cnpj = (qs.get('cnpj') || '').toLowerCase();
    const status = qs.get('status') || '';

    let filtered = mockContracts.slice();
    if (search) filtered = filtered.filter(c => c.cliente.toLowerCase().includes(search) || c.uc.toLowerCase().includes(search));
    if (cnpj) filtered = filtered.filter(c => c.cnpj.toLowerCase().includes(cnpj));
    if (status) filtered = filtered.filter(c => c.status === status);
    if (startDate) filtered = filtered.filter(c => c.ciclo >= startDate);
    if (endDate) filtered = filtered.filter(c => c.ciclo <= endDate);

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return { items, total, page, pageSize } as unknown as T;
  }
  throw new Error(`No mock for ${path}`);
}
