import { PerspectiveCamera } from 'three'
import { describe, expect, it } from 'vitest'
import { pickNearest } from '../../src/scene/picking'

const camera = new PerspectiveCamera(45, 1, 0.1, 100)
camera.position.set(0, 0, 5)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld()
const SIZE = 800
const CENTER = SIZE / 2
const pick = (points: number[], x: number, y: number, maxPx = 10) => pickNearest(Float32Array.from(points), points.length / 3, camera, SIZE, SIZE, x, y, maxPx)

describe('pickNearest', () => {
  it('devuelve el índice del punto más cercano al puntero dentro del radio', () => {
    expect(pick([0, 0, 1.5, 0.5, 0, 1.5], CENTER, CENTER)).toBe(0)
    const second = pick([0, 0, 1.5, 0.5, 0, 1.5], CENTER + 100, CENTER, 400) // el segundo está a la derecha del centro
    expect(second).toBe(1)
  })

  it('devuelve -1 si no hay ninguno dentro del radio', () => {
    expect(pick([0.5, 0, 1.5], CENTER, CENTER, 10)).toBe(-1)
  })

  it('con dos a la misma distancia elige el más cercano a la cámara, no el de detrás', () => {
    // mismo píxel: el de z=3 está delante del de z=1.5 desde la cámara en z=5
    expect(pick([0, 0, 1.5, 0, 0, 3], CENTER, CENTER)).toBe(1)
  })

  it('ignora los que tapa la Tierra', () => {
    expect(pick([0, 0, -1.5], CENTER, CENTER)).toBe(-1)
    expect(pick([0, 0, -1.5, 0.3, 0, 1.5], CENTER, CENTER, 400)).toBe(1)
  })

  it('ignora los que están detrás de la cámara', () => {
    expect(pick([0, 0, 8], CENTER, CENTER)).toBe(-1)
  })

  it('sin puntos devuelve -1', () => {
    expect(pickNearest(new Float32Array(0), 0, camera, SIZE, SIZE, CENTER, CENTER, 10)).toBe(-1)
  })

  it('solo mira los `count` primeros', () => {
    expect(pickNearest(Float32Array.from([0.5, 0, 1.5, 0, 0, 1.5]), 1, camera, SIZE, SIZE, CENTER, CENTER, 400)).toBe(0)
  })
})
