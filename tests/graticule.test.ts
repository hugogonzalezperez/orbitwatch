import { describe, expect, it } from 'vitest'
import { graticuleVertices } from '../src/globe/graticule'

describe('graticuleVertices', () => {
  const radius = 1.001
  const v = graticuleVertices(30, 36, radius)

  it('todos los puntos están sobre la esfera del radio pedido', () => {
    for (let i = 0; i < v.length; i += 3) {
      expect(Math.hypot(v[i]!, v[i + 1]!, v[i + 2]!)).toBeCloseTo(radius, 5)
    }
  })

  it('con paso de 30° hay 5 paralelos (±60°, ±30°, 0°) y 12 meridianos', () => {
    // cada línea con 36 segmentos aporta 36 pares de vértices (LineSegments) = 36 * 2 * 3 floats
    const perLine = 36 * 2 * 3
    expect(v.length / perLine).toBe(5 + 12)
  })

  it('un paso que no divide 90° se rechaza', () => {
    expect(() => graticuleVertices(40, 36, radius)).toThrow()
  })
})
