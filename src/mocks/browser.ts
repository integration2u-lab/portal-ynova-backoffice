import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

async function unregisterMockServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => registration.active?.scriptURL.includes('mockServiceWorker.js'))
        .map((registration) => registration.unregister()),
    );
  } catch (error) {
    console.warn('[msw] Falha ao remover service worker de mock', error);
  }
}

export async function startWorker() {
  await worker.start({
    serviceWorker: { url: '/mockServiceWorker.js' },
    onUnhandledRequest: 'bypass',
  });
}

export async function stopWorker() {
  try {
    worker.stop();
  } catch (error) {
    console.warn('[msw] Falha ao parar worker de mock', error);
  }
  await unregisterMockServiceWorker();
}
