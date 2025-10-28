import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = 'http://ec2-18-116-166-24.us-east-2.compute.amazonaws.com:4000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    allowedHosts: [
      'https://api.ynovamarketplace.com.br',
      'http://localhost:3000',
    ],
    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
  },
})
