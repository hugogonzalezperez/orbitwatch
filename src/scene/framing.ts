import { Vector3 } from 'three'
import { INITIAL_DISTANCE, MAX_DISTANCE, MIN_DISTANCE } from './config'

/** Hasta qué fracción del semicampo de visión puede alejarse del eje el punto más extremo de la órbita: deja un margen al borde. */
export const FRAMING_MARGIN = 0.8

interface Framing {
  /** Radio de la órbita en su punto más alto, en radios terrestres desde el centro. */
  orbitRadius: number
  /** Ángulo entre la dirección del satélite y la de la cámara: con la cámara inclinada, el punto cercano de la órbita se acerca a ella y se ve más abierto. */
  tiltRad: number
  fovDeg: number
  aspect: number
  currentDistance: number
}

/**
 * Distancia de la cámara al centro a la que se ve el satélite con su órbita: tanto el punto más cercano a la cámara
 * (el que más se abre en vertical por la perspectiva) como los laterales caben dentro de `FRAMING_MARGIN` del campo.
 * Si ya estás más cerca de la distancia habitual la respeta; si estás más lejos, vuelve a ella (a menos que la órbita
 * pida más), para no dejar la Tierra diminuta tras mirar un satélite lejano. Respeta los límites del zoom.
 */
export function framingDistance({ orbitRadius, tiltRad, fovDeg, aspect, currentDistance }: Framing): number {
  const halfVertical = (fovDeg / 2) * (Math.PI / 180)
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect)
  const nearPoint = orbitRadius * Math.cos(tiltRad) + (orbitRadius * Math.sin(tiltRad)) / Math.tan(halfVertical * FRAMING_MARGIN)
  const sides = orbitRadius / Math.tan(halfHorizontal * FRAMING_MARGIN)
  return Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, Math.min(currentDistance, INITIAL_DISTANCE), nearPoint, sides))
}

const UP = new Vector3(0, 1, 0)

/**
 * Dirección (unitaria) desde la que mirar un satélite: a `tiltRad` de la suya, hacia un lado u otro del plano de su
 * órbita, para no verla de canto. Se elige el lado en que el satélite cae en la mitad superior de la pantalla, que es
 * la que dejan libre el reloj (abajo) y la ficha y la columna (a los lados).
 */
export function focusDirection(satellite: Vector3, orbitNormal: Vector3, tiltRad: number): Vector3 {
  const side = satellite.clone().normalize().multiplyScalar(Math.cos(tiltRad))
  const toward = (sign: 1 | -1) => side.clone().addScaledVector(orbitNormal, sign * Math.sin(tiltRad))
  const above = (camera: Vector3) => {
    const axis = camera.clone().normalize()
    const screenUp = UP.clone().addScaledVector(axis, -UP.dot(axis))
    return satellite.clone().addScaledVector(axis, -satellite.dot(axis)).dot(screenUp)
  }
  const plus = toward(1)
  return above(plus) >= above(toward(-1)) ? plus : toward(-1)
}
