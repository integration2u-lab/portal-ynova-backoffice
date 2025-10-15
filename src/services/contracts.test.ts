import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';

type RecordedRequest = {
  url: string;
  method: string;
  body: string;
};

const buildContract = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'contract-1',
  contract_code: 'C-1',
  client_name: 'Cliente Teste',
  cnpj: '00.000.000/0001-00',
  segment: 'Comercial',
  contact_responsible: 'Maria',
  contracted_volume_mwh: '100',
  status: 'Ativo',
  energy_source: 'Convencional',
  contracted_modality: 'Teste',
  start_date: '2024-01-01T00:00:00.000Z',
  end_date: '2024-12-31T00:00:00.000Z',
  billing_cycle: 'Mensal',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('contracts service', () => {
  const requests: RecordedRequest[] = [];

  beforeEach(() => {
    requests.length = 0;
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    server.resetHandlers();
  });

  it('uses the Vite proxy in development without sending a body on GET', async () => {
    server.use(
      http.get('*/api/contracts', async ({ request }) => {
        const body = await request.text();
        requests.push({ url: request.url, method: request.method, body });
        return HttpResponse.json({ data: [buildContract()] });
      }),
    );

    vi.stubEnv('DEV', 'true');
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('VITE_USE_PROXY', 'true');
    vi.stubEnv('VITE_API_BASE_URL', '');

    const { listContracts } = await import('./contracts');
    const contracts = await listContracts();

    expect(contracts).toHaveLength(1);
    expect(contracts[0].contract_code).toBe('C-1');
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('GET');
    expect(requests[0].body).toBe('');
    expect(requests[0].url.endsWith('/api/contracts')).toBe(true);
  });

  it('falls back to the API base URL when proxy is disabled', async () => {
    server.use(
      http.get('http://api.example.com/contracts', async ({ request }) => {
        const body = await request.text();
        requests.push({ url: request.url, method: request.method, body });
        return HttpResponse.json({ contracts: [buildContract({ id: 'contract-2' })] });
      }),
    );

    vi.stubEnv('DEV', 'false');
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_USE_PROXY', 'false');
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.example.com');

    const { listContracts } = await import('./contracts');
    const contracts = await listContracts();

    expect(contracts).toHaveLength(1);
    expect(contracts[0].id).toBe('contract-2');
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: 'http://api.example.com/contracts',
      method: 'GET',
      body: '',
    });
  });
});
