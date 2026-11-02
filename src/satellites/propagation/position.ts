import { degreesLat, degreesLong, eciToGeodetic, gstime, json2satrec, propagate, shadowFraction, type SatRec } from 'satellite.js'
import { temeToScene } from '../../shared/frames'
import { sunVectorAu } from '../../shared/sun'
import { kmToUnits } from '../../shared/units'
import type { OmmRecord } from '../data/omm'

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
  /** Velocidad en los ejes de la escena, en km/s. */
  velocity: [number, number, number]
  /** Fracción del disco solar que le llega: 1 al sol, 0 en la sombra de la Tierra, entre medias en penumbra. */
  sunlight: number
}

export const createTracked = (record: OmmRecord): Tracked => ({ record, satrec: json2satrec(record) })

/** Posición en la escena inercial (radios terrestres), o `null` si SGP4 no puede calcularla. */
export function sceneAt({ satrec }: Tracked, date: Date): [number, number, number] | null {
  const result = propagate(satrec, date)
  if (!result) return null
  const [x, y, z] = temeToScene(result.position.x, result.position.y, result.position.z)
  const scene: [number, number, number] = [kmToUnits(x), kmToUnits(y), kmToUnits(z)]
  return scene.every(Number.isFinite) ? scene : null
}

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
    velocity: temeToScene(v.x, v.y, v.z),
    sunlight: 1 - shadowFraction(sunVectorAu(date), p),
  }
  return state.scene.every(Number.isFinite) && Number.isFinite(state.sunlight) ? state : null
}
