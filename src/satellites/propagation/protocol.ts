import type { OmmRecord } from '../data/omm'
import type { Sample } from './batch'

/** Mensajes de la página al Worker. */
export type WorkerRequest =
  | { type: 'init'; records: OmmRecord[] }
  | { type: 'propagate'; epochMs: number }

/** Mensajes del Worker a la página. Los buffers de la muestra se transfieren, no se copian. */
export type WorkerResponse = { type: 'sample' } & Sample
