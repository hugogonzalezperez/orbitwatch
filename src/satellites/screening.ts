import { EARTH_RADIUS_KM, kmToUnits } from '../shared/units'

export interface Approach {
  /** Índices de los dos objetos, con `a < b`. */
  a: number
  b: number
  distanceKm: number
}

const SCENE_LIMIT = 10 // más lejos que cualquier órbita (el máximo ronda 7,3 radios): lo oculto o inválido se manda a 1e6 y no cuenta
const MIN_THRESHOLD_KM = 1
const CELL_BITS = 17 // coordenadas de celda de 17 bits (±10 radios con celdas de 1 km caben): la clave cabe en un número exacto de 51 bits
const CELL_RANGE = 2 ** CELL_BITS

const present = (positions: ArrayLike<number>, i: number): boolean =>
  Math.abs(positions[i * 3]!) < SCENE_LIMIT && Math.abs(positions[i * 3 + 1]!) < SCENE_LIMIT && Math.abs(positions[i * 3 + 2]!) < SCENE_LIMIT

const distanceKm = (positions: ArrayLike<number>, i: number, j: number): number =>
  Math.hypot(positions[i * 3]! - positions[j * 3]!, positions[i * 3 + 1]! - positions[j * 3 + 1]!, positions[i * 3 + 2]! - positions[j * 3 + 2]!) * EARTH_RADIUS_KM

const closest = (found: Approach[], limit: number): Approach[] => found.sort((p, q) => p.distanceKm - q.distanceKm || p.a - q.a || p.b - q.b).slice(0, limit)

/**
 * Los pares de objetos a menos de `thresholdKm` en un instante, de los `count` de `positions` (tripletas en radios
 * terrestres). Cribado en dos pasos: una rejilla con celdas del tamaño del umbral deja solo los vecinos de cada objeto (los
 * 27 alrededor de su celda) y la distancia exacta decide. Es una instantánea de distancias, no una predicción de colisión.
 */
export function findApproaches(positions: ArrayLike<number>, count: number, thresholdKm: number, limit = 50): Approach[] {
  const threshold = Math.max(thresholdKm, MIN_THRESHOLD_KM)
  const cell = kmToUnits(threshold)
  const offset = Math.ceil(SCENE_LIMIT / cell) + 1
  const coordinate = (value: number): number => Math.floor(value / cell) + offset
  const keyOf = (x: number, y: number, z: number): number => (x * CELL_RANGE + y) * CELL_RANGE + z
  const cells = new Map<number, number[]>()
  const cellOf = new Int32Array(count * 3)
  for (let i = 0; i < count; i++) {
    if (!present(positions, i)) continue
    const x = coordinate(positions[i * 3]!)
    const y = coordinate(positions[i * 3 + 1]!)
    const z = coordinate(positions[i * 3 + 2]!)
    cellOf.set([x, y, z], i * 3)
    const key = keyOf(x, y, z)
    const bucket = cells.get(key)
    if (bucket) bucket.push(i)
    else cells.set(key, [i])
  }
  const found: Approach[] = []
  for (let i = 0; i < count; i++) {
    if (!present(positions, i)) continue
    const x = cellOf[i * 3]!
    const y = cellOf[i * 3 + 1]!
    const z = cellOf[i * 3 + 2]!
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          const bucket = cells.get(keyOf(x + dx, y + dy, z + dz))
          if (!bucket) continue
          for (const j of bucket) {
            if (j <= i) continue
            const km = distanceKm(positions, i, j)
            if (km <= thresholdKm) found.push({ a: i, b: j, distanceKm: km })
          }
        }
  }
  return closest(found, limit)
}

/** Lo mismo comparando todos con todos: sirve de referencia en los tests y en el benchmark. */
export function findApproachesNaive(positions: ArrayLike<number>, count: number, thresholdKm: number, limit = 50): Approach[] {
  const found: Approach[] = []
  for (let i = 0; i < count; i++) {
    if (!present(positions, i)) continue
    for (let j = i + 1; j < count; j++) {
      if (!present(positions, j)) continue
      const km = distanceKm(positions, i, j)
      if (km <= thresholdKm) found.push({ a: i, b: j, distanceKm: km })
    }
  }
  return closest(found, limit)
}
