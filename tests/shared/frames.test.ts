import { describe, expect, it } from 'vitest'
import { temeToScene } from '../../src/shared/frames'

const expectVec = (actual: number[], expected: number[]) => expected.forEach((v, i) => expect(actual[i]).toBeCloseTo(v, 12))

describe('frames', () => {
  it('el norte (Z de TEME) es arriba (Y de la escena) y el eje X coincide', () => {
    expectVec(temeToScene(0, 0, 1), [0, 1, 0])
    expectVec(temeToScene(1, 0, 0), [1, 0, 0])
  })

  it('el eje Y de TEME (90° este) cae en −Z, como la rejilla y la textura', () => {
    expectVec(temeToScene(0, 1, 0), [0, 0, -1])
  })

  it('conserva la orientación: no es un espejo (producto mixto +1)', () => {
    const [ax, ay, az] = temeToScene(1, 0, 0)
    const [bx, by, bz] = temeToScene(0, 1, 0)
    const [cx, cy, cz] = temeToScene(0, 0, 1)
    const tripleProduct = ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)
    expect(tripleProduct).toBeCloseTo(1, 12)
  })
})
