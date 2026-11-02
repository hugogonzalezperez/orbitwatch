import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { INITIAL_DISTANCE, MAX_DISTANCE, MIN_DISTANCE } from '../../src/scene/config'
import { FRAMING_MARGIN, focusDirection, framingDistance } from '../../src/scene/framing'

const FOV = 45
const ASPECT = 1400 / 850
const TILT = (35 * Math.PI) / 180
const frame = (orbitRadius: number, currentDistance: number, overrides: Partial<Parameters<typeof framingDistance>[0]> = {}) =>
  framingDistance({ orbitRadius, tiltRad: TILT, fovDeg: FOV, aspect: ASPECT, currentDistance, ...overrides })

/** Ángulo respecto al eje de la cámara del punto más cercano de la órbita (el que más se sale de la pantalla en vertical). */
const nearPointAngle = (orbitRadius: number, distance: number) => Math.atan((orbitRadius * Math.sin(TILT)) / (distance - orbitRadius * Math.cos(TILT)))

describe('framingDistance', () => {
  it('una órbita baja cabe a la distancia actual: no se toca el zoom', () => {
    expect(frame(1.07, 3.5)).toBe(3.5)
  })

  it('una geoestacionaria (6,6 radios) aleja la cámara hasta que su punto más cercano cabe en el encuadre vertical', () => {
    const d = frame(6.62, 3.5)
    expect(d).toBeGreaterThan(6.62) // la cámara queda por fuera de la órbita
    const halfFov = (FOV / 2) * (Math.PI / 180)
    expect(nearPointAngle(6.62, d)).toBeLessThanOrEqual(halfFov * FRAMING_MARGIN + 1e-9)
    expect(nearPointAngle(6.62, d)).toBeGreaterThan(halfFov * FRAMING_MARGIN * 0.95) // y no se aleja más de lo necesario
  })

  it('una elíptica con apogeo a 7,3 radios también cabe sin pasar del límite del zoom', () => {
    const d = frame(7.3, 3.5)
    expect(d).toBeLessThanOrEqual(MAX_DISTANCE)
    expect(nearPointAngle(7.3, d)).toBeLessThanOrEqual(((FOV / 2) * (Math.PI / 180)) * FRAMING_MARGIN + 1e-9)
  })

  it('si el usuario está más lejos de la distancia habitual y la órbita no lo pide, vuelve a ella: no deja la Tierra diminuta', () => {
    expect(frame(1.07, 12)).toBe(INITIAL_DISTANCE)
    expect(frame(6.62, 19)).toBe(frame(6.62, 3.5)) // lo que pide el encuadre, no la distancia de antes
  })

  it('si el usuario ya está más cerca de la habitual, la respeta mientras el encuadre lo permita', () => {
    expect(frame(1.07, 3)).toBe(3)
  })

  it('con la cámara muy pegada a la Tierra, una órbita baja la aleja lo justo para ver el satélite', () => {
    const d = frame(1.07, MIN_DISTANCE)
    expect(d).toBeGreaterThan(MIN_DISTANCE)
    expect(d).toBeLessThan(3.5)
  })

  it('una ventana apaisada necesita menos distancia que una cuadrada si manda el ancho', () => {
    expect(frame(6.62, 3.5, { aspect: 1 })).toBeGreaterThanOrEqual(frame(6.62, 3.5, { aspect: 2 }))
  })

  it('nunca pasa de los límites del zoom', () => {
    expect(frame(100, 3.5)).toBe(MAX_DISTANCE)
    expect(frame(0.1, 0.5)).toBe(MIN_DISTANCE)
  })
})

describe('focusDirection', () => {
  const up = new Vector3(0, 1, 0)
  /** Dónde cae el satélite respecto al centro de la pantalla, en vertical: positivo = por encima. */
  const verticalOffset = (satellite: Vector3, camera: Vector3) => {
    const axis = camera.clone().normalize()
    const screenUp = up.clone().addScaledVector(axis, -up.dot(axis))
    return satellite.clone().addScaledVector(axis, -satellite.dot(axis)).dot(screenUp)
  }

  it.each([
    ['órbita hacia el norte', new Vector3(1, 0, 0), new Vector3(0, 1, 0)],
    ['órbita retrógrada (normal hacia el sur)', new Vector3(1, 0, 0), new Vector3(0, -1, 0)],
    ['satélite en el otro lado', new Vector3(0, 0, -1), new Vector3(0, 1, 0)],
  ])('%s: la cámara está a la inclinación pedida del satélite y este queda en la mitad superior', (_n, satellite, normal) => {
    const direction = focusDirection(satellite, normal, TILT)
    expect(direction.length()).toBeCloseTo(1, 9)
    expect(direction.angleTo(satellite)).toBeCloseTo(TILT, 9)
    expect(verticalOffset(satellite, direction)).toBeGreaterThan(0)
  })

  it('no modifica los vectores que recibe', () => {
    const satellite = new Vector3(2, 0, 0)
    const normal = new Vector3(0, 1, 0)
    focusDirection(satellite, normal, TILT)
    expect(satellite.toArray()).toEqual([2, 0, 0])
    expect(normal.toArray()).toEqual([0, 1, 0])
  })
})
