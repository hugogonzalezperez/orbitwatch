import { describe, expect, it } from 'vitest'
import { INITIAL_DISTANCE, MAX_DISTANCE, MAX_ORBIT_RADIUS, MIN_DISTANCE } from '../../src/scene/config'
import { framingDistance } from '../../src/scene/framing'

describe('límites de zoom', () => {
  it('cerca ≈ 2 000 km sobre la superficie (≈ 1,31 unidades del centro)', () => {
    expect(MIN_DISTANCE).toBeCloseTo(1.314, 3)
  })

  it('lejos ≈ 120 000 km sobre la superficie (≈ 19,8 unidades del centro)', () => {
    expect(MAX_DISTANCE).toBeCloseTo(19.835, 2)
  })

  it('se puede alejar lo bastante para encuadrar la órbita más lejana de los datos (apogeo de 7,3 radios)', () => {
    const needed = framingDistance({ orbitRadius: 7.3, tiltRad: (35 * Math.PI) / 180, fovDeg: 45, aspect: 1.65, currentDistance: 1 })
    expect(needed).toBeLessThan(MAX_DISTANCE) // si no, el límite del zoom recortaría el encuadre
  })

  it('el radio máximo de órbita cubre las geoestacionarias (6,6) y las elípticas de los datos (7,3)', () => {
    expect(MAX_ORBIT_RADIUS).toBeGreaterThan(7.3)
  })

  it('la vista inicial está dentro de los límites', () => {
    expect(INITIAL_DISTANCE).toBeGreaterThanOrEqual(MIN_DISTANCE)
    expect(INITIAL_DISTANCE).toBeLessThanOrEqual(MAX_DISTANCE)
  })
})
