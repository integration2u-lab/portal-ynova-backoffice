import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'https://api.ynovamarketplace.com.br', 
      'http://localhost:3000',
    ],
    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: 'src/test/setup.ts',
  }
})
