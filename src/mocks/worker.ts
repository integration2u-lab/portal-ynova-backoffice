// Optional explicit start wrapper (used if imported elsewhere)
import { worker } from './browser';

export async function startMsw() {
  await worker.start({ serviceWorker: { url: '/mockServiceWorker.js' } });
}
