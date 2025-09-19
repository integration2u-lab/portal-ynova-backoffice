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

async function bootstrap() {
  // Enable MSW only during local dev or when VITE_API_MOCK=true
  const enableMSW = import.meta.env.DEV || import.meta.env.VITE_API_MOCK === 'true';
  if (enableMSW) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ serviceWorker: { url: '/mockServiceWorker.js' } });
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
