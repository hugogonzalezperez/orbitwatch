import { describe, expect, it } from 'vitest'
import { EARTH_RADIUS_KM } from '../../src/shared/units'
import { epochDate } from '../../src/satellites/data/omm'
import { currentRevolution, orbitProgress, sampleOrbit } from '../../src/satellites/propagation/orbit'
import { createTracked, stateAt } from '../../src/satellites/propagation/position'
import { issRecord } from '../helpers/fixtures'

const iss = createTracked(issRecord())
const t = new Date(epochDate(iss.record).getTime() + 3_600_000)
const rev = currentRevolution(iss, t)!
const northKm = (date: Date) => stateAt(iss, date)!.scene[1] * EARTH_RADIUS_KM // Y de la escena = Z de TEME = norte

describe('currentRevolution', () => {
  it('es una vuelta de unos 93 min que contiene la hora pedida', () => {
    expect(rev).not.toBeNull()
    expect(rev.start.getTime()).toBeLessThanOrEqual(t.getTime())
    expect(rev.end.getTime()).toBeGreaterThan(t.getTime())
    const minutes = (rev.end.getTime() - rev.start.getTime()) / 60_000
    expect(minutes).toBeGreaterThan(90)
    expect(minutes).toBeLessThan(95)
  })

  it('empieza y acaba al cruzar el ecuador de sur a norte', () => {
    for (const edge of [rev.start, rev.end]) {
      expect(Math.abs(northKm(edge))).toBeLessThan(1)
      expect(northKm(new Date(edge.getTime() + 10_000))).toBeGreaterThan(0)
      expect(northKm(new Date(edge.getTime() - 10_000))).toBeLessThan(0)
    }
  })

  it('la vuelta de un instante cualquiera de esa vuelta es la misma', () => {
    const inside = new Date((rev.start.getTime() + rev.end.getTime()) / 2)
    const again = currentRevolution(iss, inside)!
    expect(Math.abs(again.start.getTime() - rev.start.getTime())).toBeLessThan(1000)
    expect(Math.abs(again.end.getTime() - rev.end.getTime())).toBeLessThan(1000)
  })
})

describe('currentRevolution en órbitas sin cruce del ecuador o de más de 150 min', () => {
  const base = issRecord()
  const geo = createTracked({ ...base, MEAN_MOTION: 1.0027, ECCENTRICITY: 0.0002, INCLINATION: 0.05 })
  const gps = createTracked({ ...base, MEAN_MOTION: 2.0056, ECCENTRICITY: 0.001, INCLINATION: 55 })
  const when = new Date(epochDate(base).getTime() + 5 * 3_600_000)

  it.each([
    ['geoestacionaria', geo, 1436],
    ['GPS', gps, 718],
  ])('%s: da una vuelta de un periodo que contiene la hora pedida', (_nombre, tracked, minutes) => {
    const r = currentRevolution(tracked, when)!
    expect(r).not.toBeNull()
    expect((r.end.getTime() - r.start.getTime()) / 60_000).toBeCloseTo(minutes, 0)
    expect(r.start.getTime()).toBeLessThanOrEqual(when.getTime())
    expect(r.end.getTime()).toBeGreaterThan(when.getTime())
  })

  it('la vuelta es la misma para cualquier instante de ella y la siguiente empieza donde acaba', () => {
    const r = currentRevolution(geo, when)!
    const inside = new Date((r.start.getTime() + r.end.getTime()) / 2)
    expect(currentRevolution(geo, inside)!.start.getTime()).toBe(r.start.getTime())
    expect(currentRevolution(geo, r.end)!.start.getTime()).toBe(r.end.getTime())
  })

  it('la órbita geoestacionaria dibujada está a unos 6,6 radios del centro, en todos sus puntos', () => {
    const r = currentRevolution(geo, when)!
    const points = sampleOrbit(geo, r, 100)
    for (let i = 0; i < 100; i++) expect(Math.hypot(points[i * 3]!, points[i * 3 + 1]!, points[i * 3 + 2]!)).toBeCloseTo(6.62, 1)
  })
})

describe('sampleOrbit', () => {
  const pointCount = 600
  const points = sampleOrbit(iss, rev, pointCount)
  const at = (i: number) => [points[i * 3]!, points[i * 3 + 1]!, points[i * 3 + 2]!] as const

  it('da exactamente los puntos pedidos, el primero al empezar la vuelta y el último al acabar', () => {
    expect(points.length).toBe(pointCount * 3)
    const first = stateAt(iss, rev.start)!.scene
    const last = stateAt(iss, rev.end)!.scene
    for (let k = 0; k < 3; k++) {
      expect(at(0)[k]).toBeCloseTo(first[k]!, 5)
      expect(at(pointCount - 1)[k]).toBeCloseTo(last[k]!, 5)
    }
  })

  it('todos los puntos están a la altura de la ISS', () => {
    for (let i = 0; i < pointCount; i++) {
      const radius = Math.hypot(...at(i))
      expect(radius).toBeGreaterThan(1.05)
      expect(radius).toBeLessThan(1.1)
    }
  })

  it('es una curva casi cerrada y continua', () => {
    const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!)
    expect(dist(at(0), at(pointCount - 1))).toBeLessThan(0.02) // ~130 km: la órbita gira un poco en una vuelta
    for (let i = 1; i < pointCount; i++) expect(dist(at(i - 1), at(i))).toBeLessThan(0.015)
  })
})

describe('orbitProgress', () => {
  const r = { start: new Date('2026-11-02T10:00:00Z'), end: new Date('2026-11-02T11:00:00Z') }

  it('da la fracción recorrida y lo que falta', () => {
    expect(orbitProgress(r, new Date('2026-11-02T10:15:00Z'))).toEqual({ fraction: 0.25, remainingMs: 45 * 60_000 })
  })

  it('se queda entre 0 y 1 fuera de la vuelta', () => {
    expect(orbitProgress(r, new Date('2026-11-02T09:00:00Z')).fraction).toBe(0)
    expect(orbitProgress(r, new Date('2026-11-02T12:00:00Z'))).toEqual({ fraction: 1, remainingMs: 0 })
  })
})
