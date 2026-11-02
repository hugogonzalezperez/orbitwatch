import { gstime } from 'satellite.js'
import { describe, expect, it } from 'vitest'
import { EARTH_RADIUS_KM } from '../../src/shared/units'
import { epochDate, findIss } from '../../src/satellites/data/stations'
import { createTracked, stateAt } from '../../src/satellites/propagation/position'
import fixture from '../fixtures/stations.json'

const iss = createTracked(findIss(fixture))
const oneHourAfterEpoch = new Date(epochDate(iss.record).getTime() + 3_600_000)

describe('stateAt (ISS)', () => {
  const state = stateAt(iss, oneHourAfterEpoch)!

  it('calcula un estado', () => {
    expect(state).not.toBeNull()
  })

  it('está a unos 400 km de altura, a 7,6–7,7 km/s y dentro de su inclinación', () => {
    expect(state.altKm).toBeGreaterThan(380)
    expect(state.altKm).toBeLessThan(450)
    expect(state.speedKmS).toBeGreaterThan(7.6)
    expect(state.speedKmS).toBeLessThan(7.7)
    expect(Math.abs(state.latDeg)).toBeLessThanOrEqual(51.7)
    expect(state.lonDeg).toBeGreaterThanOrEqual(-180)
    expect(state.lonDeg).toBeLessThanOrEqual(180)
  })

  it('la posición en la escena está en unidades de radio terrestre, a la altura correcta', () => {
    const radiusKm = Math.hypot(...state.scene) * EARTH_RADIUS_KM
    expect(radiusKm - EARTH_RADIUS_KM).toBeCloseTo(state.altKm, -2) // ±25 km: la Tierra es achatada
  })

  it('la longitud en la escena, menos el giro de la Tierra, es la longitud geodésica (mismo marco que la Tierra)', () => {
    const [x, , z] = state.scene
    let lon = Math.atan2(-z, x) - gstime(oneHourAfterEpoch)
    lon = Math.atan2(Math.sin(lon), Math.cos(lon)) // a (−π, π]
    expect((lon * 180) / Math.PI).toBeCloseTo(state.lonDeg, 6)
  })

  it('un cuarto de órbita después la posición ha cambiado de forma coherente (~92 min por vuelta)', () => {
    const later = stateAt(iss, new Date(oneHourAfterEpoch.getTime() + 23 * 60_000))!
    const a = state.scene
    const b = later.scene
    const angle = Math.acos((a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b)))
    expect((angle * 180) / Math.PI).toBeGreaterThan(80)
    expect((angle * 180) / Math.PI).toBeLessThan(100)
  })
})

describe('findIss', () => {
  it('encuentra la ISS por su número de catálogo', () => {
    expect(findIss(fixture).NORAD_CAT_ID).toBe(25544)
  })

  it('rechaza algo que no es una lista', () => {
    expect(() => findIss({})).toThrow(/lista/)
  })

  it('rechaza una lista sin la ISS', () => {
    expect(() => findIss(fixture.filter((o) => o.NORAD_CAT_ID !== 25544))).toThrow(/25544/)
  })

  it('rechaza un registro de la ISS con campos numéricos que no son números', () => {
    const broken = fixture.map((o) => (o.NORAD_CAT_ID === 25544 ? { ...o, MEAN_MOTION: 'x' } : o))
    expect(() => findIss(broken)).toThrow(/MEAN_MOTION/)
  })
})
