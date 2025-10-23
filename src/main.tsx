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

async function bootstrap() {
  if (typeof window !== 'undefined') {
    const { ensureMockServiceWorker, stopMockServiceWorker, mswShouldEnable } = await import('./mocks/browser')
    if (mswShouldEnable()) {
      await ensureMockServiceWorker()
    } else {
      await stopMockServiceWorker()
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
