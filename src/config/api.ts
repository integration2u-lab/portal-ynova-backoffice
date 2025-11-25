/**
 * Configuração centralizada da API
 * 
 * Todas as URLs são carregadas do arquivo .env
 * Para alterar, edite o arquivo .env na raiz do projeto
 */

// URL base da API de balanço energético e contratos
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://cb3b96abd14c.ngrok-free.app';

// URL do webhook N8N para upload de planilha CSV (base64-to-json)
export const ENERGY_BALANCE_WEBHOOK_URL = import.meta.env.VITE_ENERGY_BALANCE_WEBHOOK || 'https://n8n.ynovamarketplace.com/webhook/base64-to-json';

// URL do webhook N8N para processamento de faturas
export const INVOICE_WEBHOOK_URL = import.meta.env.VITE_INVOICE_WEBHOOK || 'https://n8n.ynovamarketplace.com/webhook-test/8d7b84b3-f20d-4374-a812-76db38ebc77d';

// URL do webhook N8N para simulação de leads
export const LEAD_SIMULATION_WEBHOOK_URL = import.meta.env.VITE_LEAD_SIMULATION_WEBHOOK || 'https://n8n.ynovamarketplace.com/webhook/mockBalancoEnergetico';

// URL da API de autenticação/IDP
export const IDP_API_URL = import.meta.env.VITE_IDP_API_URL || 'https://api.ynovamarketplace.com/api/idp';

// Mock mode - altere para true se quiser usar dados mockados
export const USE_MOCK_API = false;

// Configurações adicionais
export const API_CONFIG = {
  baseURL: API_BASE_URL,
  energyBalanceWebhook: ENERGY_BALANCE_WEBHOOK_URL,
  invoiceWebhook: INVOICE_WEBHOOK_URL,
  leadSimulationWebhook: LEAD_SIMULATION_WEBHOOK_URL,
  idpApiUrl: IDP_API_URL,
  useMock: USE_MOCK_API,
  timeout: 30000, // 30 segundos
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
} as const;

// Log para debug (remover em produção)
console.log('[API Config] 🔧 Configuração carregada:', {
  baseURL: API_BASE_URL,
  energyBalanceWebhook: ENERGY_BALANCE_WEBHOOK_URL,
  invoiceWebhook: INVOICE_WEBHOOK_URL,
  leadSimulationWebhook: LEAD_SIMULATION_WEBHOOK_URL,
  idpApiUrl: IDP_API_URL,
  useMock: USE_MOCK_API,
});

