/**
 * Configuração centralizada da API
 * 
 * Para trocar a URL da API, edite a constante API_BASE_URL abaixo.
 */

// URL base da API de balanço energético
export const API_BASE_URL = 'https://f2336283d9e5.ngrok-free.app';

// Mock mode - altere para true se quiser usar dados mockados
export const USE_MOCK_API = false;

// Configurações adicionais
export const API_CONFIG = {
  baseURL: API_BASE_URL,
  useMock: USE_MOCK_API,
  timeout: 30000, // 30 segundos
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
} as const;

// Log para debug (remover em produção)
console.log('[API Config] 🔧 Configuração carregada:', {
  baseURL: API_BASE_URL,
  useMock: USE_MOCK_API,
});

