// Hilo aparte que calcula con SGP4 todos los satélites del enjambre; la página solo recibe el resultado.
import { createBatch, createSample, propagateBatch, type Batch } from './batch'
import type { WorkerRequest, WorkerResponse } from './protocol'

interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
  postMessage(message: WorkerResponse, transfer: Transferable[]): void
}
const scope = self as unknown as WorkerScope

let batch: Batch | null = null

scope.onmessage = ({ data }) => {
  if (data.type === 'init') {
    batch = createBatch(data.records)
    return
  }
  if (!batch) return
  const sample = createSample(batch.satrecs.length)
  propagateBatch(batch, data.epochMs, sample)
  scope.postMessage({ type: 'sample', ...sample }, [sample.positions.buffer, sample.velocities.buffer, sample.valid.buffer])
}
