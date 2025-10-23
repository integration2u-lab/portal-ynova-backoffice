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

export const ensureMockServiceWorker = async (forceEnable?: boolean): Promise<boolean> => {
  const shouldEnable = typeof forceEnable === 'boolean' ? forceEnable : shouldEnableMocking();

  if (!shouldEnable) {
    setGlobalMswFlag(false);
    await worker.stop();
    await unregisterMockServiceWorker();
    return false;
  }

  setGlobalMswFlag(true);
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
  return true;
};

export const stopMockServiceWorker = async (): Promise<void> => {
  setGlobalMswFlag(false);
  await worker.stop();
  await unregisterMockServiceWorker();
};

export const mswShouldEnable = shouldEnableMocking;
