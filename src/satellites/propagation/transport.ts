import type { OmmRecord } from '../data/omm'
import { createBatch, createSample, propagateBatch, type Sample } from './batch'
import type { WorkerRequest, WorkerResponse } from './protocol'

/** Cómo se calculan los satélites: en un Worker o, si no lo hay, en el hilo principal. Una petición a la vez. */
export interface PropagationTransport {
  request(epochMs: number): Promise<Sample>
  dispose(): void
}

export function createInlineTransport(records: OmmRecord[]): PropagationTransport {
  const batch = createBatch(records)
  return {
    async request(epochMs) {
      const sample = createSample(records.length)
      propagateBatch(batch, epochMs, sample)
      return sample
    },
    dispose() {},
  }
}

export function createWorkerTransport(records: OmmRecord[]): PropagationTransport {
  const worker = new Worker(new URL('./propagation.worker.ts', import.meta.url), { type: 'module' })
  let pending: { resolve: (sample: Sample) => void; reject: (error: Error) => void } | null = null
  worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
    pending?.resolve(data)
    pending = null
  }
  worker.onerror = (event) => {
    pending?.reject(new Error(event.message || 'el Worker falló'))
    pending = null
  }
  const send = (message: WorkerRequest) => worker.postMessage(message)
  send({ type: 'init', records })
  return {
    request: (epochMs) =>
      new Promise((resolve, reject) => {
        pending = { resolve, reject }
        send({ type: 'propagate', epochMs })
      }),
    dispose: () => worker.terminate(),
  }
}

/** Con Worker si el navegador lo permite; si no arranca, el cálculo pasa al hilo principal y la web sigue funcionando. */
export function createTransport(records: OmmRecord[]): PropagationTransport {
  if (typeof Worker === 'undefined') return createInlineTransport(records)
  let active: PropagationTransport = createWorkerTransport(records)
  let fellBack = false
  return {
    async request(epochMs) {
      try {
        return await active.request(epochMs)
      } catch (error) {
        if (fellBack) throw error
        console.warn('No se pudo usar un Worker; el cálculo pasa al hilo principal', error)
        active.dispose()
        fellBack = true
        active = createInlineTransport(records)
        return active.request(epochMs)
      }
    },
    dispose: () => active.dispose(),
  }
}
