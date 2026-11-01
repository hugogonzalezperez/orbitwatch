import { describe, expect, it } from 'vitest'
import { altitudeKmToDistance, EARTH_RADIUS_KM, kmToUnits } from '../src/shared/units'

describe('units', () => {
  it('1 unidad es un radio terrestre', () => {
    expect(kmToUnits(EARTH_RADIUS_KM)).toBe(1)
  })

  it('una altitud de 0 km queda sobre la superficie, a 1 unidad del centro', () => {
    expect(altitudeKmToDistance(0)).toBe(1)
  })

  it('la distancia al centro es radio + altitud, en unidades', () => {
    expect(altitudeKmToDistance(EARTH_RADIUS_KM)).toBeCloseTo(2, 10)
  })
})
