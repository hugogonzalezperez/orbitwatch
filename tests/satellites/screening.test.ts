import { describe, expect, it } from 'vitest'
import { findApproaches, findApproachesNaive } from '../../src/satellites/screening'
import { EARTH_RADIUS_KM } from '../../src/shared/units'

const km = (value: number) => value / EARTH_RADIUS_KM
/** Tripletas x, y, z en radios terrestres. */
const points = (...xyz: Array<[number, number, number]>) => Float32Array.from(xyz.flat())
const ids = (approaches: Array<{ a: number; b: number }>) => approaches.map(({ a, b }) => [a, b])

describe('findApproaches', () => {
  it('encuentra los pares dentro del umbral, con su distancia en km, de menor a mayor', () => {
    const positions = points([1.1, 0, 0], [1.1, km(8), 0], [1.1, km(30), 0], [-1.2, 0, 0], [1.1, 0, km(3)])
    const result = findApproaches(positions, 5, 10)
    expect(ids(result)).toEqual([[0, 4], [0, 1], [1, 4]])
    expect(result[0]!.distanceKm).toBeCloseTo(3, 1)
    expect(result[1]!.distanceKm).toBeCloseTo(8, 1)
    expect(result[2]!.distanceKm).toBeCloseTo(Math.hypot(8, 3), 1)
  })

  it('un par que cae a ambos lados de la frontera de una celda se encuentra igual', () => {
    const cell = km(10)
    const positions = points([cell * 100 - km(1), 0, 0], [cell * 100 + km(1), 0, 0])
    expect(ids(findApproaches(positions, 2, 10))).toEqual([[0, 1]])
  })

  it('lo que está más lejos que el umbral no sale, aunque comparta celda vecina', () => {
    expect(findApproaches(points([1.1, 0, 0], [1.1, km(10.5), 0]), 2, 10)).toEqual([])
  })

  it('ignora lo que está fuera de la escena (los ocultos o inválidos van lejos y no cuentan como pareja)', () => {
    const FAR = 1e6
    expect(findApproaches(points([FAR, FAR, FAR], [FAR, FAR, FAR], [1.1, 0, 0]), 3, 10)).toEqual([])
  })

  it('limita el número de resultados a los más cercanos', () => {
    const positions = points([1.1, 0, 0], [1.1, km(1), 0], [1.1, km(3), 0], [1.1, km(6), 0])
    expect(findApproaches(positions, 4, 10, 2)).toHaveLength(2)
  })

  it('coincide con la búsqueda ingenua en datos al azar', () => {
    let seed = 7
    const random = () => ((seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648) / 2_147_483_648)
    const count = 600
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const lat = Math.asin(2 * random() - 1)
      const lon = 2 * Math.PI * random()
      const r = 1.05 + 0.02 * random()
      positions.set([r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.sin(lon)], i * 3)
    }
    const fast = findApproaches(positions, count, 150, 1000)
    const naive = findApproachesNaive(positions, count, 150, 1000)
    expect(fast.length).toBeGreaterThan(0)
    expect(ids(fast).map((p) => p.join())).toEqual(ids(naive).map((p) => p.join()))
  })
})
