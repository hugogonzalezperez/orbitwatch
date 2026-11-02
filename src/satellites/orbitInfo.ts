import type { OmmRecord } from './data/omm'

const MU_KM3_S2 = 398_600.4418 // parámetro gravitatorio de la Tierra
const EARTH_EQUATORIAL_KM = 6378.137
const GEOSYNCHRONOUS_MINUTES = 1436.07 // un día sidéreo
const GEOSYNCHRONOUS_TOLERANCE = 0.02
const ELLIPTICAL_ECCENTRICITY = 0.25
const LOW_ORBIT_LIMIT_KM = 2000
const GEOSTATIONARY_KM = 35_786

export type Regime = 'low' | 'medium' | 'geosynchronous' | 'elliptical' | 'high'

export interface OrbitDescription {
  periodMinutes: number
  /** Altitud sobre el ecuador terrestre en el punto más bajo y en el más alto. */
  perigeeKm: number
  apogeeKm: number
  inclinationDeg: number
  eccentricity: number
  regime: Regime
}

/** Periodo, altitudes y tipo de órbita a partir de los elementos orbitales. */
export function describeOrbit(record: OmmRecord): OrbitDescription {
  const meanMotion = Number(record.MEAN_MOTION)
  const eccentricity = Number(record.ECCENTRICITY)
  const periodMinutes = 1440 / meanMotion
  const meanMotionRadS = (meanMotion * 2 * Math.PI) / 86_400
  const semiMajorKm = (MU_KM3_S2 / meanMotionRadS ** 2) ** (1 / 3)
  const perigeeKm = semiMajorKm * (1 - eccentricity) - EARTH_EQUATORIAL_KM
  const apogeeKm = semiMajorKm * (1 + eccentricity) - EARTH_EQUATORIAL_KM
  const meanKm = (perigeeKm + apogeeKm) / 2
  let regime: Regime
  if (eccentricity >= ELLIPTICAL_ECCENTRICITY) regime = 'elliptical'
  else if (Math.abs(periodMinutes - GEOSYNCHRONOUS_MINUTES) <= GEOSYNCHRONOUS_MINUTES * GEOSYNCHRONOUS_TOLERANCE) regime = 'geosynchronous'
  else if (meanKm < LOW_ORBIT_LIMIT_KM) regime = 'low'
  else if (meanKm < GEOSTATIONARY_KM) regime = 'medium'
  else regime = 'high'
  return { periodMinutes, perigeeKm, apogeeKm, inclinationDeg: Number(record.INCLINATION), eccentricity, regime }
}

const RULER_MAX_KM = 40_000

/** Posición (0 a 1) de una altitud en la regla de la ficha: escala de raíz cuadrada, para que la órbita baja no se pegue a la superficie. */
export const altitudeRulerPosition = (altitudeKm: number): number => Math.min(1, Math.sqrt(Math.max(0, altitudeKm) / RULER_MAX_KM))

/** Altitudes de referencia que se marcan en la regla. */
export const ALTITUDE_MARKS: ReadonlyArray<{ km: number; label: string }> = [
  { km: 400, label: 'ISS' },
  { km: 20_200, label: 'GPS' },
  { km: GEOSTATIONARY_KM, label: 'GEO' },
]
