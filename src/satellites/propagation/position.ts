import { degreesLat, degreesLong, eciToGeodetic, gstime, json2satrec, propagate, type SatRec } from 'satellite.js'
import { temeToScene } from '../../shared/frames'
import { kmToUnits } from '../../shared/units'
import type { OmmRecord } from '../data/stations'

export interface Tracked {
  record: OmmRecord
  satrec: SatRec
}

export interface SatelliteState {
  /** Posición en la escena inercial, en radios terrestres. */
  scene: [number, number, number]
  latDeg: number
  lonDeg: number
  altKm: number
  speedKmS: number
}

export const createTracked = (record: OmmRecord): Tracked => ({ record, satrec: json2satrec(record) })

/** Estado en `date`, o `null` si SGP4 no puede calcularlo (por ejemplo, órbita decaída). */
export function stateAt({ satrec }: Tracked, date: Date): SatelliteState | null {
  const result = propagate(satrec, date)
  if (!result) return null
  const { position: p, velocity: v } = result
  const [x, y, z] = temeToScene(p.x, p.y, p.z)
  const geodetic = eciToGeodetic(p, gstime(date))
  const state: SatelliteState = {
    scene: [kmToUnits(x), kmToUnits(y), kmToUnits(z)],
    latDeg: degreesLat(geodetic.latitude),
    lonDeg: degreesLong(geodetic.longitude),
    altKm: geodetic.height,
    speedKmS: Math.hypot(v.x, v.y, v.z),
  }
  return state.scene.every(Number.isFinite) ? state : null
}
