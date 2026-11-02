import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { createFlight } from '../../src/scene/flight'

const from = new Vector3(0, 0, 3.5)
const to = new Vector3(8, 0, 0)

describe('createFlight', () => {
  const flight = createFlight(from, to, 700)

  it('empieza en el origen y acaba exactamente en el destino', () => {
    expect(flight.position(0).distanceTo(from)).toBeLessThan(1e-9)
    expect(flight.position(700).distanceTo(to)).toBeLessThan(1e-9)
    expect(flight.position(5000).distanceTo(to)).toBeLessThan(1e-9)
    expect(flight.position(-10).distanceTo(from)).toBeLessThan(1e-9)
  })

  it('la distancia al centro va de una a otra sin pasarse', () => {
    for (const t of [100, 350, 600]) {
      const r = flight.position(t).length()
      expect(r).toBeGreaterThanOrEqual(3.5 - 1e-9)
      expect(r).toBeLessThanOrEqual(8 + 1e-9)
    }
  })

  it('la dirección gira de forma monótona hacia el destino', () => {
    const angles = [0, 100, 200, 400, 700].map((t) => flight.position(t).angleTo(to))
    for (let i = 1; i < angles.length; i++) expect(angles[i]!).toBeLessThanOrEqual(angles[i - 1]! + 1e-9)
  })

  it('sale rápido y frena al llegar: la primera mitad del tiempo recorre más de la mitad del camino', () => {
    const total = from.angleTo(to)
    expect(from.angleTo(flight.position(350))).toBeGreaterThan(total / 2)
  })

  it('no da NaN si el destino es el punto opuesto', () => {
    const p = createFlight(new Vector3(0, 0, 3), new Vector3(0, 0, -3), 500).position(250)
    expect(Number.isFinite(p.x + p.y + p.z)).toBe(true)
    expect(p.length()).toBeCloseTo(3, 6)
  })

  it('con duración 0 va directo al destino', () => {
    expect(createFlight(from, to, 0).position(0).distanceTo(to)).toBeLessThan(1e-9)
  })

  it('dice cuándo ha terminado', () => {
    expect(flight.finished(699)).toBe(false)
    expect(flight.finished(700)).toBe(true)
  })
})
