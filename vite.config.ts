import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseado no mode
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      // Proxy para a API do Banco Central (IPCA) para resolver CORS
      proxy: {
        '/api-bcb': {
          target: 'https://api.bcb.gov.br',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-bcb/, ''),
          secure: true,
        },
        // Proxy for IDP API to bypass CORS during development
        '/api/idp': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
      allowedHosts: [
        'https://api.ynovamarketplace.com.br',
        'http://localhost:3000',
      ],
      hmr: {
        // Usa HTTP/WS ao invés de HTTPS/WSS para evitar erros de conexão
        // O servidor está rodando em HTTP, então o HMR também deve usar HTTP
        protocol: 'ws',
        host: 'localhost',
        port: 5173,
      },
    },
    // Forçar o Vite a expor as variáveis para import.meta.env
    define: {
      'import.meta.env.VITE_ENERGY_BALANCE_API_URL': JSON.stringify(env.VITE_ENERGY_BALANCE_API_URL),
      'import.meta.env.VITE_API_MOCK': JSON.stringify(env.VITE_API_MOCK),
      'import.meta.env.VITE_ALLOW_ANY_LOGIN': JSON.stringify(env.VITE_ALLOW_ANY_LOGIN),
      'import.meta.env.VITE_SKIP_LOGIN': JSON.stringify(env.VITE_SKIP_LOGIN),
    },
  }
})
