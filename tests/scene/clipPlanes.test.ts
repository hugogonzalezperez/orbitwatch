import { describe, expect, it } from 'vitest'
import { MAX_DISTANCE, MAX_ORBIT_RADIUS, MIN_DISTANCE } from '../../src/scene/config'
import { clipPlanes } from '../../src/scene/clipPlanes'

describe('clipPlanes', () => {
  it('near queda por delante de la superficie y far detrás del globo en todo el rango de zoom', () => {
    for (const d of [MIN_DISTANCE, 3, MAX_DISTANCE]) {
      const { near, far } = clipPlanes(d)
      expect(near).toBeGreaterThan(0)
      expect(near).toBeLessThan(d - 1) // la superficie más cercana está a d - 1
      expect(far).toBeGreaterThanOrEqual(d + 1) // el punto más lejano del globo está a d + 1
    }
  })

  it('far alcanza al satélite más lejano aunque esté detrás del globo: ningún objeto en órbita se recorta', () => {
    for (const d of [MIN_DISTANCE, 3, MAX_DISTANCE]) expect(clipPlanes(d).far).toBeGreaterThanOrEqual(d + MAX_ORBIT_RADIUS)
  })

  it('near crece al alejarse, para conservar precisión de profundidad', () => {
    expect(clipPlanes(MAX_DISTANCE).near).toBeGreaterThan(clipPlanes(MIN_DISTANCE).near)
  })
})
