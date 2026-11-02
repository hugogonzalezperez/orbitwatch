import type { OrbitInput } from '../data/columns'
import { createBatch, createSample, propagateBatch, type Sample } from './batch'
import type { WorkerRequest, WorkerResponse } from './protocol'

/** Cómo se calculan los satélites: en un Worker o, si no lo hay, en el hilo principal. Una petición a la vez. */
export interface PropagationTransport {
  request(epochMs: number): Promise<Sample>
  dispose(): void
}

export function createInlineTransport(input: OrbitInput): PropagationTransport {
  const batch = createBatch(input)
  return {
    async request(epochMs) {
      const sample = createSample(input.count)
      propagateBatch(batch, epochMs, sample)
      return sample
    },
    dispose() {},
  }
}

export function createWorkerTransport(input: OrbitInput): PropagationTransport {
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
  // Se transfiere una copia: la original queda para el cálculo en el hilo principal si el Worker falla.
  const copy: OrbitInput = { ...input, ids: input.ids.slice(), elements: input.elements.slice() }
  worker.postMessage({ type: 'init', input: copy } satisfies WorkerRequest, [copy.ids.buffer, copy.elements.buffer])
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
export function createTransport(input: OrbitInput): PropagationTransport {
  if (typeof Worker === 'undefined') return createInlineTransport(input)
  let active: PropagationTransport = createWorkerTransport(input)
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
        active = createInlineTransport(input)
        return active.request(epochMs)
      }
    },
    dispose: () => active.dispose(),
  }
}
