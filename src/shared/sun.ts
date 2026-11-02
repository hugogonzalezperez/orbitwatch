import { jday, sunPos } from 'satellite.js'
import { temeToScene } from './frames'

/** Distancia (en radios terrestres) a la que se dibuja el Sol: la dirección es real, la distancia no (1 UA serían ≈23 500). */
export const SKY_RADIUS = 60

/** Vector hacia el Sol en TEME, en UA (Vallado, ±0,01°; contrastado con astronomy-engine, peor caso 0,008°). */
export const sunVectorAu = (date: Date) => sunPos(jday(date)).rsun

/** Dirección unitaria hacia el Sol en la escena inercial. */
export function sunDirectionScene(date: Date): [number, number, number] {
  const { x, y, z } = sunVectorAu(date)
  const [sx, sy, sz] = temeToScene(x, y, z)
  const length = Math.hypot(sx, sy, sz)
  return [sx / length, sy / length, sz / length]
}
