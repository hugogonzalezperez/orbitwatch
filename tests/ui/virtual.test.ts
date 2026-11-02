import { describe, expect, it } from 'vitest'
import { visibleRange } from '../../src/ui/virtual'

describe('visibleRange', () => {
  it('devuelve las filas que caben más un margen por arriba y por abajo', () => {
    // 100 filas de 40 px, ventana de 200 px (5 filas), desplazada 400 px (fila 10), margen de 2
    expect(visibleRange(400, 200, 40, 100, 2)).toEqual({ start: 8, end: 17 })
  })

  it('no se sale de los límites al principio ni al final', () => {
    expect(visibleRange(0, 200, 40, 100, 3)).toEqual({ start: 0, end: 8 })
    expect(visibleRange(3800, 200, 40, 100, 3)).toEqual({ start: 92, end: 100 })
  })

  it('con menos filas que ventana devuelve todas', () => {
    expect(visibleRange(0, 800, 40, 3, 2)).toEqual({ start: 0, end: 3 })
  })

  it('sin filas devuelve un rango vacío', () => {
    expect(visibleRange(0, 200, 40, 0, 2)).toEqual({ start: 0, end: 0 })
  })

  it('un desplazamiento mayor que el contenido no da un rango negativo', () => {
    const { start, end } = visibleRange(9999, 200, 40, 10, 2)
    expect(end).toBe(10)
    expect(start).toBeLessThanOrEqual(end)
  })

  it('con una fila a medio ver al principio de la ventana, también la incluye', () => {
    // desplazado 20 px: la fila 0 se ve a medias y la 5 asoma por abajo (200 + 20 = 220 → hasta la fila 5)
    const { start, end } = visibleRange(20, 200, 40, 100, 0)
    expect(start).toBe(0)
    expect(end).toBeGreaterThanOrEqual(6)
  })
})
