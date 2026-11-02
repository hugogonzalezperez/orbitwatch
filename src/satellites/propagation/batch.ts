import { json2satrec, propagate, type SatRec } from 'satellite.js'
import { temeToScene } from '../../shared/frames'
import { EARTH_RADIUS_KM, kmToUnits } from '../../shared/units'
import { ELEMENT_FIELDS, type OrbitInput } from '../data/columns'
import type { OmmRecord } from '../data/omm'

export interface Batch {
  satrecs: SatRec[]
}

/** Posición y velocidad de cada satélite en un instante, un hueco por satélite en el mismo orden que el lote. */
export interface Sample {
  /** Instante (ms Unix) al que se refieren las posiciones. */
  epochMs: number
  /** Tripletas x, y, z en la escena inercial, en radios terrestres. */
  positions: Float32Array
  /** Tripletas en radios terrestres por segundo. */
  velocities: Float32Array
  /** 1 si SGP4 pudo calcularlo; 0 si no (su posición y velocidad quedan a cero). */
  valid: Uint8Array
}

/** El registro del satélite `i` con lo que `json2satrec` necesita (los nombres no hacen falta para calcular). */
function recordFromInput({ ids, epoch, elements }: OrbitInput, i: number): OmmRecord {
  const record: Record<string, string | number> = { OBJECT_NAME: '', OBJECT_ID: '', EPOCH: epoch[i]!, NORAD_CAT_ID: ids[i]! }
  ELEMENT_FIELDS.forEach((field, k) => (record[field] = elements[i * ELEMENT_FIELDS.length + k]!))
  return record as unknown as OmmRecord
}

export function createBatch(input: OrbitInput): Batch {
  return { satrecs: Array.from({ length: input.count }, (_, i) => json2satrec(recordFromInput(input, i))) }
}

export const createSample = (count: number): Sample => ({
  epochMs: 0,
  positions: new Float32Array(count * 3),
  velocities: new Float32Array(count * 3),
  valid: new Uint8Array(count),
})

/** Calcula todos los satélites del lote en `epochMs` y lo escribe en `out`, sobrescribiendo lo anterior. */
export function propagateBatch({ satrecs }: Batch, epochMs: number, out: Sample): void {
  const date = new Date(epochMs)
  out.epochMs = epochMs
  for (let i = 0; i < satrecs.length; i++) {
    const result = propagate(satrecs[i]!, date)
    const position = result ? temeToScene(result.position.x, result.position.y, result.position.z) : null
    const velocity = result ? temeToScene(result.velocity.x, result.velocity.y, result.velocity.z) : null
    const ok = position !== null && velocity !== null && position.every(Number.isFinite) && velocity.every(Number.isFinite)
    out.valid[i] = ok ? 1 : 0
    for (let k = 0; k < 3; k++) {
      out.positions[i * 3 + k] = ok ? kmToUnits(position[k]!) : 0
      out.velocities[i * 3 + k] = ok ? velocity[k]! / EARTH_RADIUS_KM : 0
    }
  }
}
