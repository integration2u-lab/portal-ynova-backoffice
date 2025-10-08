export type Contract = {
  id: string;
  contract_code: string;
  client_id: string;
  client_name: string;
  cnpj: string;
  segment: string;
  contact_responsible: string;
  contracted_volume_mwh: string;
  status: string;
  energy_source: string;
  contracted_modality: string;
  start_date: string;
  end_date: string;
  billing_cycle: string;
  upper_limit_percent?: string | null;
  lower_limit_percent?: string | null;
  flexibility_percent?: string | null;
  average_price_mwh?: string | null;
  spot_price_ref_mwh?: string | null;
  compliance_consumption?: string | null;
  compliance_nf?: string | null;
  compliance_invoice?: string | null;
  compliance_charges?: string | null;
  compliance_overall?: string | null;
  created_at: string;
  updated_at: string;
};

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') || '';

function buildUrl(path: string) {
  return `${API_BASE}${path}`;
}

export async function getContracts(): Promise<Contract[]> {
  const response = await fetch(buildUrl('/contracts'), { method: 'GET' });
  if (!response.ok) {
    throw new Error(`GET /contracts ${response.status}`);
  }
  return response.json();
}

export type CreateContractPayload = Omit<Contract, 'id' | 'created_at' | 'updated_at'>;

export async function createContract(payload: CreateContractPayload): Promise<Contract> {
  const response = await fetch(buildUrl('/contracts'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `POST /contracts ${response.status}`);
  }

  return response.json();
}
