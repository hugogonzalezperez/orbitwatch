import { PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { isOccluded, projectToScreen } from '../../src/scene/picking'

describe('isOccluded', () => {
  const camera = new Vector3(0, 0, 3.5)

  it('un punto detrás de la Tierra está tapado', () => {
    expect(isOccluded(camera, new Vector3(0, 0, -1.07))).toBe(true)
  })

  it('un punto delante de la Tierra se ve', () => {
    expect(isOccluded(camera, new Vector3(0, 0, 1.07))).toBe(false)
  })

  it('un punto a un lado, fuera del disco, se ve', () => {
    expect(isOccluded(camera, new Vector3(1.2, 0, 0))).toBe(false)
  })

  it('un punto detrás pero fuera del disco de la Tierra se ve', () => {
    expect(isOccluded(camera, new Vector3(2, 0, -1))).toBe(false)
  })
})

describe('projectToScreen', () => {
  const camera = new PerspectiveCamera(45, 2)
  camera.position.set(0, 0, 3.5)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  camera.updateProjectionMatrix()

  it('el centro de la Tierra cae en el centro de la pantalla', () => {
    const p = projectToScreen(new Vector3(0, 0, 0), camera, 800, 400)
    expect(p.x).toBeCloseTo(400, 6)
    expect(p.y).toBeCloseTo(200, 6)
  })

  it('arriba en la escena es arriba en pantalla (y menor)', () => {
    expect(projectToScreen(new Vector3(0, 0.5, 0), camera, 800, 400).y).toBeLessThan(200)
  })

  it('a la derecha en la escena es a la derecha en pantalla', () => {
    expect(projectToScreen(new Vector3(0.5, 0, 0), camera, 800, 400).x).toBeGreaterThan(400)
  })
})
