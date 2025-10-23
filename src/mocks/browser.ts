import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

const parseBooleanFlag = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const setGlobalMswFlag = (enabled: boolean): void => {
  if (typeof window !== 'undefined') {
    window.MSW_ENABLED = enabled;
  }
  (globalThis as Record<string, unknown>).MSW_ENABLED = enabled;
};

const shouldEnableMocking = (): boolean => {
  if (parseBooleanFlag(import.meta.env?.VITE_USE_MSW_REAL)) {
    return false;
  }

  if (import.meta.env.MODE === 'test') {
    return true;
  }

  if (parseBooleanFlag(import.meta.env?.VITE_ENABLE_MSW)) {
    return true;
  }

  if (parseBooleanFlag(import.meta.env?.VITE_API_MOCK)) {
    return true;
  }

  return false;
};

const unregisterMockServiceWorker = async (): Promise<void> => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map((registration) => {
      const scriptURL = registration.active?.scriptURL ?? registration.installing?.scriptURL ?? '';
      if (scriptURL.includes('mockServiceWorker.js')) {
        return registration.unregister();
      }
      return Promise.resolve(false);
    }),
  );
};

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
