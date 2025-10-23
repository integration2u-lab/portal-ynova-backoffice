import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

const deregisterMockServiceWorkers = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const mockRegistrations = registrations.filter((registration) =>
      registration.active?.scriptURL.includes('mockServiceWorker.js'),
    );

    await Promise.all(mockRegistrations.map((registration) => registration.unregister()));
  } catch (error) {
    console.warn('[msw] Falha ao remover service worker de mock', error);
  }
};

export const startWorker = async () => {
  await worker.start({
    serviceWorker: { url: '/mockServiceWorker.js' },
    onUnhandledRequest: 'bypass',
  });
};

export const stopWorker = async () => {
  try {
    worker.stop();
  } catch (error) {
    console.warn('[msw] Falha ao parar worker de mock', error);
  }

  await deregisterMockServiceWorkers();
};
