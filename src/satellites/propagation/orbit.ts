import { propagate } from 'satellite.js'
import { sceneAt, type Tracked } from './position'

export interface Revolution {
  /** Cruce del ecuador de sur a norte con el que empieza la vuelta. */
  start: Date
  /** Siguiente cruce igual: donde acaba. */
  end: Date
}

const SCAN_STEP_MS = 30_000
const MAX_SCAN_STEPS = 300 // 150 min: más que cualquier vuelta de una órbita baja
const BISECTION_STEPS = 20

// Z de TEME (norte), en km; `null` si SGP4 falla.
const north = ({ satrec }: Tracked, ms: number): number | null => propagate(satrec, new Date(ms))?.position.z ?? null

/** Instante del cruce entre `before` (hacia el sur) y `after` (hacia el norte o sobre el ecuador). */
function refineCrossing(tracked: Tracked, before: number, after: number): number {
  for (let i = 0; i < BISECTION_STEPS; i++) {
    const middle = (before + after) / 2
    const z = north(tracked, middle)
    if (z === null) break
    if (z < 0) before = middle
    else after = middle
  }
  return after
}

/** Vuelta de un periodo contada desde la época: para las órbitas sin cruce ecuatorial que buscar (casi ecuatoriales) o más largas que el rastreo. */
function periodRevolution({ record }: Tracked, date: Date): Revolution {
  const periodMs = Math.round((1440 / Number(record.MEAN_MOTION)) * 60_000) // en milisegundos enteros, para que los límites de cada vuelta sean fechas exactas
  const epochMs = Date.parse(`${record.EPOCH}Z`)
  const start = epochMs + Math.floor((date.getTime() - epochMs) / periodMs) * periodMs
  return { start: new Date(start), end: new Date(start + periodMs) }
}

/**
 * La vuelta que contiene `date`: de un cruce ascendente del ecuador al siguiente. Si no se encuentra (órbita casi
 * ecuatorial, como la geoestacionaria, o de más de 150 min, como las de GPS), es una vuelta de un periodo desde la época.
 * Es `null` solo si SGP4 no puede calcular el satélite a esa hora.
 */
export function currentRevolution(tracked: Tracked, date: Date): Revolution | null {
  if (north(tracked, date.getTime()) === null) return null
  return ascendingCrossingRevolution(tracked, date) ?? periodRevolution(tracked, date)
}

function ascendingCrossingRevolution(tracked: Tracked, date: Date): Revolution | null {
  let current = date.getTime()
  let currentZ = north(tracked, current)
  if (currentZ === null) return null

  let start: number | null = null
  for (let i = 0; i < MAX_SCAN_STEPS && start === null; i++) {
    const previous = current - SCAN_STEP_MS
    const previousZ = north(tracked, previous)
    if (previousZ === null) return null
    if (previousZ < 0 && currentZ >= 0) start = refineCrossing(tracked, previous, current)
    current = previous
    currentZ = previousZ
  }
  if (start === null) return null

  let from = start
  let fromZ = north(tracked, from)
  if (fromZ === null) return null
  for (let i = 0; i < MAX_SCAN_STEPS; i++) {
    const next = from + SCAN_STEP_MS
    const nextZ = north(tracked, next)
    if (nextZ === null) return null
    if (fromZ < 0 && nextZ >= 0) return { start: new Date(start), end: new Date(refineCrossing(tracked, from, next)) }
    from = next
    fromZ = nextZ
  }
  return null
}

/** `pointCount` puntos de la vuelta (x, y, z en la escena inercial), repartidos a partes iguales en el tiempo. */
export function sampleOrbit(tracked: Tracked, revolution: Revolution, pointCount: number): Float32Array {
  const startMs = revolution.start.getTime()
  const spanMs = revolution.end.getTime() - startMs
  const points = new Float32Array(pointCount * 3)
  let last: [number, number, number] = [0, 0, 0]
  for (let i = 0; i < pointCount; i++) {
    last = sceneAt(tracked, new Date(startMs + (spanMs * i) / (pointCount - 1))) ?? last // si falla un punto, repite el anterior
    points.set(last, i * 3)
  }
  return points
}

export function orbitProgress(revolution: Revolution, date: Date): { fraction: number; remainingMs: number } {
  const start = revolution.start.getTime()
  const end = revolution.end.getTime()
  const fraction = Math.min(1, Math.max(0, (date.getTime() - start) / (end - start)))
  return { fraction, remainingMs: Math.max(0, end - date.getTime()) }
}
