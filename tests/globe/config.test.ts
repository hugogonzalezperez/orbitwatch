import { describe, expect, it } from 'vitest'
import { CLOUD_RADIUS, CLOUD_SEGMENTS, GRATICULE_RADIUS } from '../../src/globe/config'
import { EARTH_RADIUS_KM } from '../../src/shared/units'

describe('capas de la esfera', () => {
  it('rejilla y nubes quedan apiladas sobre la superficie sin separarse de ella', () => {
    expect(GRATICULE_RADIUS).toBeGreaterThan(1)
    expect(CLOUD_RADIUS).toBeGreaterThan(GRATICULE_RADIUS)
    expect((CLOUD_RADIUS - 1) * EARTH_RADIUS_KM).toBeLessThan(50)
  })

  it('el centro de las caras de las nubes no se hunde bajo la superficie', () => {
    // Con pocas caras asoma la Tierra a través de la capa y salen rombos. El centro de una cara está a la media diagonal
    // de los vértices, que sí están en CLOUD_RADIUS.
    const halfDiagonal = Math.hypot(Math.PI / CLOUD_SEGMENTS.width, Math.PI / (2 * CLOUD_SEGMENTS.height))
    expect(CLOUD_RADIUS * Math.cos(halfDiagonal)).toBeGreaterThan(1)
  })
})
