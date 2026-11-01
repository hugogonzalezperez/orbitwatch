import { describe, expect, it } from 'vitest'
import { INITIAL_DISTANCE, MAX_DISTANCE, MIN_DISTANCE } from '../../src/scene/config'

describe('límites de zoom', () => {
  it('cerca ≈ 2 000 km sobre la superficie (≈ 1,31 unidades del centro)', () => {
    expect(MIN_DISTANCE).toBeCloseTo(1.314, 3)
  })

  it('lejos ≈ 60 000 km sobre la superficie (≈ 10,4 unidades del centro)', () => {
    expect(MAX_DISTANCE).toBeCloseTo(10.418, 3)
  })

  it('la vista inicial está dentro de los límites', () => {
    expect(INITIAL_DISTANCE).toBeGreaterThanOrEqual(MIN_DISTANCE)
    expect(INITIAL_DISTANCE).toBeLessThanOrEqual(MAX_DISTANCE)
  })
})
