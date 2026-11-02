import type { OrbitInput } from '../data/columns'
import type { Sample } from './batch'

/** Mensajes de la página al Worker. Los arrays tipados del `init` se transfieren, no se copian. */
export type WorkerRequest =
  | { type: 'init'; input: OrbitInput }
  | { type: 'propagate'; epochMs: number }

/** Mensajes del Worker a la página. Los buffers de la muestra se transfieren, no se copian. */
export type WorkerResponse = { type: 'sample' } & Sample
