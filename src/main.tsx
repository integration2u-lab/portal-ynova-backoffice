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
    console.log('[MSW] ✅ Iniciando Mock Service Worker...')
    const { worker } = await import('./mocks/browser')
    await worker.start({ 
      serviceWorker: { url: '/mockServiceWorker.js' },
      // 'bypass' faz com que requisições sem handler sejam ignoradas silenciosamente
      // Isso evita os warnings infinitos no console
      // Para requisições de localhost (Vite HMR), o MSW tentará fazer passthrough,
      // mas como não há servidor, isso causará erro. A solução é garantir que
      // o MSW não está ativo quando não deveria estar (que é o caso padrão).
      onUnhandledRequest: 'bypass',
    })
    console.log('[MSW] ✅ Mock Service Worker iniciado')
  } else {
    // Desabilitar e desregistrar o MSW se estiver ativo
    console.log('[MSW] 🔄 Desabilitando Mock Service Worker...')
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          if (registration.active?.scriptURL.includes('mockServiceWorker') || 
              registration.scope.includes('mockServiceWorker')) {
            await registration.unregister()
            console.log('[MSW] ❌ Mock Service Worker desregistrado:', registration.scope)
          }
        }
        // Também tenta desregistrar diretamente
        if (navigator.serviceWorker.controller) {
          const controller = navigator.serviceWorker.controller
          if (controller.scriptURL.includes('mockServiceWorker')) {
            await navigator.serviceWorker.getRegistration()?.then(reg => reg?.unregister())
            console.log('[MSW] ❌ Controller do MSW desregistrado')
          }
        }
        // Força o desregistro de todos os service workers relacionados ao MSW
        const allRegistrations = await navigator.serviceWorker.getRegistrations()
        for (const reg of allRegistrations) {
          if (reg.scope.includes('mock') || reg.active?.scriptURL.includes('mock')) {
            await reg.unregister()
            console.log('[MSW] ❌ Service Worker desregistrado:', reg.scope)
          }
        }
      } catch (error) {
        console.warn('[MSW] ⚠️ Erro ao desregistrar MSW:', error)
      }
    }
    console.log('[MSW] ✅ MSW desabilitado - usando APIs reais')
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
