import { describe, expect, it } from 'vitest'
import { facetedSphereMinRadius } from '../../src/shared/geometry'

describe('facetedSphereMinRadius', () => {
  it('es el radio por el coseno de la media diagonal de una cara', () => {
    // 128×64: media cara = π/128 en longitud y π/128 en latitud
    expect(facetedSphereMinRadius(1, 128, 64)).toBeCloseTo(Math.cos((Math.SQRT2 * Math.PI) / 128), 12)
  })

  it('escala con el radio', () => {
    expect(facetedSphereMinRadius(2, 64, 32)).toBeCloseTo(2 * facetedSphereMinRadius(1, 64, 32), 12)
  })

  it('con más caras se hunde menos y nunca supera el radio', () => {
    const coarse = facetedSphereMinRadius(1, 32, 16)
    const fine = facetedSphereMinRadius(1, 128, 64)
    expect(fine).toBeGreaterThan(coarse)
    expect(fine).toBeLessThan(1)
  })
})
