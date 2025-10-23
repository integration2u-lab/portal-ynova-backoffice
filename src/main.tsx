import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'

declare global {
  interface Window {
    MSW_ENABLED?: boolean
  }
}

const client = new QueryClient({
  defaultOptions: { queries: { retry: 0, refetchOnWindowFocus: false } }
})

const ALLOW_ANY_LOGIN = (() => {
  const flag = import.meta.env.VITE_ALLOW_ANY_LOGIN
  if (typeof flag === 'string') return flag === 'true'
  // In development mode, allow any login by default
  return import.meta.env.DEV
})()

const SHOULD_ENABLE_MSW = (() => {
  if (import.meta.env.MODE === 'test') {
    return true
  }

  const explicit = import.meta.env.VITE_ENABLE_MSW
  if (typeof explicit === 'string') {
    const normalized = explicit.trim().toLowerCase()
    return normalized === '1' || normalized === 'true'
  }

  const legacyMock = import.meta.env.VITE_API_MOCK
  if (typeof legacyMock === 'string') {
    return legacyMock.trim().toLowerCase() === 'true'
  }

  return false
})()

async function bootstrap() {
  const mswEnabled = SHOULD_ENABLE_MSW

  if (typeof window !== 'undefined') {
    window.MSW_ENABLED = mswEnabled
    ;(globalThis as typeof globalThis & { MSW_ENABLED?: boolean }).MSW_ENABLED = mswEnabled
  }

  if (mswEnabled) {
    const { startWorker } = await import('./mocks/browser')
    await startWorker()
  } else {
    const { stopWorker } = await import('./mocks/browser')
    await stopWorker()
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
