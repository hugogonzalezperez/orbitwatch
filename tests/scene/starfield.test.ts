import { describe, expect, it } from 'vitest'
import { generateStars } from '../../src/scene/starfield'

// Polo norte galáctico en el ecuador J2000: ascensión recta 192,86°, declinación 27,13°.
const GALACTIC_POLE = [-0.867666149, -0.1980763734, 0.4559837762] as const

describe('generateStars', () => {
  const stars = generateStars(4000, 7)

  it('da el número pedido de estrellas, con direcciones unitarias', () => {
    expect(stars.brightness).toHaveLength(4000)
    expect(stars.directions).toHaveLength(4000 * 3)
    for (let i = 0; i < 4000; i++) {
      expect(Math.hypot(stars.directions[i * 3]!, stars.directions[i * 3 + 1]!, stars.directions[i * 3 + 2]!)).toBeCloseTo(1, 5)
    }
  })

  it('es determinista: la misma semilla da el mismo cielo, y otra semilla da otro', () => {
    expect(generateStars(100, 7).directions).toEqual(generateStars(100, 7).directions)
    expect(generateStars(100, 8).directions).not.toEqual(generateStars(100, 7).directions)
  })

  it('el brillo está entre 0 y 1 y las estrellas tenues son mayoría', () => {
    expect(Math.min(...stars.brightness)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...stars.brightness)).toBeLessThanOrEqual(1)
    expect(stars.brightness.filter((b) => b < 0.3).length / 4000).toBeGreaterThan(0.6)
  })

  it('hay más estrellas cerca del plano de la Vía Láctea que en un cielo uniforme', () => {
    let nearPlane = 0
    for (let i = 0; i < 4000; i++) {
      const sinLatitude =
        stars.directions[i * 3]! * GALACTIC_POLE[0] + stars.directions[i * 3 + 1]! * GALACTIC_POLE[1] + stars.directions[i * 3 + 2]! * GALACTIC_POLE[2]
      if (Math.abs(sinLatitude) < Math.sin((10 * Math.PI) / 180)) nearPlane++
    }
    // Un cielo uniforme tendría un 17 % a menos de 10° del plano.
    expect(nearPlane / 4000).toBeGreaterThan(0.35)
    expect(nearPlane / 4000).toBeLessThan(0.6)
  })
})
