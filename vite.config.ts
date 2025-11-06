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
      // Proxy desabilitado - todas as chamadas vão direto para a API configurada no .env
      // A API será acessada via VITE_ENERGY_BALANCE_API_URL (ex: https://d16078567006.ngrok-free.app)
      allowedHosts: [
        'https://bfaed6f9f27a.ngrok-free.app',
        'http://localhost:3000',
      ],
      hmr: {
        clientPort: 443,
        protocol: 'wss',
      },
    },
    // Forçar o Vite a expor as variáveis para import.meta.env
    define: {
      'import.meta.env.VITE_ENERGY_BALANCE_API_URL': JSON.stringify(env.VITE_ENERGY_BALANCE_API_URL),
      'import.meta.env.VITE_API_MOCK': JSON.stringify(env.VITE_API_MOCK),
      'import.meta.env.VITE_ALLOW_ANY_LOGIN': JSON.stringify(env.VITE_ALLOW_ANY_LOGIN),
    },
  }
})
