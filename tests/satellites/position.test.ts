import { gstime } from 'satellite.js'
import { describe, expect, it } from 'vitest'
import { EARTH_RADIUS_KM } from '../../src/shared/units'
import { epochDate } from '../../src/satellites/data/omm'
import { sunDirectionScene } from '../../src/shared/sun'
import { createTracked, stateAt } from '../../src/satellites/propagation/position'
import { issRecord } from '../helpers/fixtures'

const iss = createTracked(issRecord())
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

  it('la velocidad en la escena tiene el módulo de la rapidez y es casi perpendicular a la posición (órbita casi circular)', () => {
    const [vx, vy, vz] = state.velocity
    expect(Math.hypot(vx, vy, vz)).toBeCloseTo(state.speedKmS, 9)
    const [x, y, z] = state.scene
    const cosine = (x * vx + y * vy + z * vz) / (Math.hypot(x, y, z) * Math.hypot(vx, vy, vz))
    expect(Math.abs(cosine)).toBeLessThan(0.05)
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

describe('sunlight (ISS)', () => {
  const samples = Array.from({ length: 1440 }, (_, minute) => {
    const date = new Date(oneHourAfterEpoch.getTime() + minute * 60_000)
    return { state: stateAt(iss, date)!, sun: sunDirectionScene(date) }
  })

  it('a lo largo de un día pasa por la luz y por la sombra de la Tierra, más tiempo al sol', () => {
    const lit = samples.filter((s) => s.state.sunlight > 0.99).length
    const dark = samples.filter((s) => s.state.sunlight < 0.01).length
    expect(dark).toBeGreaterThan(0)
    expect(lit / samples.length).toBeGreaterThan(0.5)
    expect(lit / samples.length).toBeLessThan(0.85)
  })

  it('solo está en la sombra completa cuando está en el lado de noche de la Tierra', () => {
    for (const { state, sun } of samples.filter((s) => s.state.sunlight < 0.01)) {
      expect(state.scene[0] * sun[0] + state.scene[1] * sun[1] + state.scene[2] * sun[2]).toBeLessThan(0)
    }
  })

  it('siempre está entre 0 y 1', () => {
    for (const { state } of samples) {
      expect(state.sunlight).toBeGreaterThanOrEqual(0)
      expect(state.sunlight).toBeLessThanOrEqual(1)
    }
  })
})
