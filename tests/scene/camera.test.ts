import { describe, expect, it } from 'vitest'
import { createCamera } from '../../src/scene/camera'
import { INITIAL_DISTANCE, INITIAL_ELEVATION_DEG } from '../../src/scene/config'

describe('createCamera', () => {
  const camera = createCamera()

  it('empieza a la distancia inicial del centro', () => {
    expect(camera.position.length()).toBeCloseTo(INITIAL_DISTANCE, 10)
  })

  it('empieza algo por encima del ecuador, en el plano del meridiano 0', () => {
    const elevation = Math.asin(camera.position.y / camera.position.length()) * (180 / Math.PI)
    expect(elevation).toBeCloseTo(INITIAL_ELEVATION_DEG, 6)
    expect(camera.position.x).toBe(0)
    expect(camera.position.z).toBeGreaterThan(0)
  })
})
