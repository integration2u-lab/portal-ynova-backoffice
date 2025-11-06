import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'

const client = new QueryClient({
  defaultOptions: { queries: { retry: 0, refetchOnWindowFocus: false } }
})

const ALLOW_ANY_LOGIN = (() => {
  const flag = import.meta.env.VITE_ALLOW_ANY_LOGIN
  if (typeof flag === 'string') return flag === 'true'
  // In development mode, allow any login by default
  return import.meta.env.DEV
})()

const SHOULD_USE_MOCK_API = (() => {
  const flag = import.meta.env.VITE_API_MOCK
  if (typeof flag === 'string') return flag === 'true'
  return false
})()

async function bootstrap() {
  // Enable MSW only when mock API mode is explicitly requested
  if (SHOULD_USE_MOCK_API) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ serviceWorker: { url: '/mockServiceWorker.js' } })
  } else {
    // Desabilitar e desregistrar o MSW se estiver ativo
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        if (registration.active?.scriptURL.includes('mockServiceWorker')) {
          await registration.unregister()
          console.log('[MSW] ❌ Mock Service Worker desregistrado')
        }
      }
    }
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <App />
          <Toaster richColors />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  )
}

bootstrap()
