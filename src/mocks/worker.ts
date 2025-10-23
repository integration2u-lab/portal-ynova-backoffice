import { startWorker, stopWorker } from './browser'

export async function startMsw() {
  await startWorker()
}

export async function stopMsw() {
  await stopWorker()
}
