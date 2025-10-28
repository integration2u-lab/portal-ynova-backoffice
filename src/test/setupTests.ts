import '@testing-library/jest-dom';
import 'whatwg-fetch';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  // @ts-expect-error - expose to JSDOM environment
  globalThis.ResizeObserver = ResizeObserverStub;
}
