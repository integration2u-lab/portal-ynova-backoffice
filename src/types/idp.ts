/**
 * TypeScript type definitions for IDP (Intelligent Document Processing) data structures
 * Based on the IDP Jobs API documentation
 */

// Tax information structure
export interface TaxInfo {
  valor: number;
  aliquota: number;
}

export interface Tributos {
  icms: TaxInfo;
  pis: TaxInfo;
  cofins: TaxInfo;
}

// Consumption history item
export interface ConsumoHistorico {
  mes: string;
  consumo_fora_ponta_kwh: number;
  consumo_ponta_kwh: number | null;
}

// Demand history item
export interface DemandaHistorico {
  mes: string;
  demanda_fora_ponta_kw: number;
  demanda_ponta_kw: number | null;
}

// Reactive energy history item
export interface EnergiaReativaHistorico {
  mes: string;
  energia_reativa_fora_ponta_kvarh: number;
  energia_reativa_ponta_kvarh: number | null;
}

// Extracted data from invoice
export interface ExtractedData {
  document_id: string;
  nome_cliente: string;
  documento_cliente: string | null;
  codigo_cliente: string | null;
  codigo_instalacao: string;
  distribuidora: string;
  distribuidora_origem: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  zip_code: string | null;
  modalidade_tarifaria: string | null;
  subgrupo: string | null;
  periodo_fatura: string;
  data_vencimento: string | null;
  valor_fatura: number;
  bandeira_tarifaria: string | null;
  demanda_contratada_fora_ponta: number | null;
  demanda_contratada_ponta: number | null;
  extracted_at: string;
  incentivo_irrigacao: boolean;
  investimento_adequacao_solar: boolean;
  historico_consumo: ConsumoHistorico[];
  historico_demanda: DemandaHistorico[];
  historico_energia_reativa: EnergiaReativaHistorico[];
  tributos: Tributos;
}

// Lead information from PostgreSQL
export interface Lead {
  id: number;
  consumer_unit: string;
  cnpj: string;
  name: string;
  email: string;
  phone: string;
  month: string;
  year: number;
  energy_value: number;
  invoice_amount: number;
  status: string;
  observations: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  source: string | null;
  id_crm: string | null;
  contract_signed: boolean;
  contract_signed_at: Date | null;
  contract_id: string | null;
  has_solar_generation: boolean;
  solar_generation_type: string | null;
  consultant_id: number | null;
  idp_id: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

// Lead document from PostgreSQL
export interface LeadDocument {
  id: number;
  lead_id: number;
  filename_original: string;
  filename_normalized: string;
  storage_url: string;
  document_type: string;
  created_at: Date | null;
  updated_at: Date | null;
}

// Lead invoice from PostgreSQL
export interface LeadInvoice {
  id: number;
  lead_id: number;
  idp_id: string | null;
  simulation: boolean;
  proposal: boolean;
  filename_original: string;
  filename_normalized: string;
  storage_url: string;
  invoice_amount: number;
  extracted_data: ExtractedData;
  created_at: Date | null;
  updated_at: Date | null;
}

// Lead data object (enriched from PostgreSQL)
export interface LeadData {
  lead: Lead | null;
  documents: LeadDocument[];
  invoices: LeadInvoice[];
}

// Main IDP Job structure
export interface IdpJob {
  document_id: string;
  job_id: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
  started_at: string;
  completed_at: string | null;
  s3_bucket: string;
  s3_key: string;
  file_size_bytes: number;
  file_size_mb: number;
  page_count: number | null;
  excel_file_name: string | null;
  excel_file_size_bytes: number | null;
  excel_generated_at: string | null;
  excel_s3_url: string | null;
  textract_output_bucket: string | null;
  textract_output_prefix: string | null;
  extracted_data: ExtractedData | null;
  lead_data: LeadData | null;
}

// Pagination structure
export interface Pagination {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// API Response structure for listing IDP jobs
export interface IdpJobsResponse {
  success: boolean;
  message: string;
  data: {
    items: IdpJob[];
    pagination: Pagination;
  };
}

// API Response structure for a single IDP job
export interface IdpJobResponse {
  success: boolean;
  message: string;
  data: IdpJob;
}

// Document upload response
export interface DocumentUploadResponse {
  success: boolean;
  data: LeadDocument;
  message: string;
}

// Error response structure
export interface ApiErrorResponse {
  success: false;
  message: string;
  error: string;
}

