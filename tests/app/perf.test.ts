import { describe, expect, it } from 'vitest'
import { createPerfMeter, isPerfEnabled } from '../../src/app/perf'

describe('isPerfEnabled', () => {
  it('se activa con ?perf, con ?perf=1 y con otros parámetros delante', () => {
    expect(isPerfEnabled('?perf')).toBe(true)
    expect(isPerfEnabled('?perf=1')).toBe(true)
    expect(isPerfEnabled('?t=2026-03-20T14:46:00Z&perf')).toBe(true)
  })

  it('no se activa sin el parámetro, ni con ?perf=0', () => {
    expect(isPerfEnabled('')).toBe(false)
    expect(isPerfEnabled('?t=2026-03-20T14:46:00Z')).toBe(false)
    expect(isPerfEnabled('?perf=0')).toBe(false)
  })
})

describe('createPerfMeter', () => {
  it('cuenta lo ocurrido en la última ventana: por segundo, media y máximo', () => {
    const meter = createPerfMeter(1000)
    for (const [ms, at] of [[2, 100], [4, 400], [9, 900]] as const) meter.record('render', ms, at)
    const s = meter.snapshot(1000)
    expect(s.render.perSecond).toBe(3)
    expect(s.render.meanMs).toBeCloseTo(5, 6)
    expect(s.render.maxMs).toBe(9)
  })

  it('olvida lo que quedó fuera de la ventana', () => {
    const meter = createPerfMeter(1000)
    meter.record('render', 50, 0)
    meter.record('render', 2, 1500)
    const s = meter.snapshot(1600)
    expect(s.render.perSecond).toBe(1)
    expect(s.render.maxMs).toBe(2)
  })

  it('lleva por separado el dibujo y la actualización de la escena', () => {
    const meter = createPerfMeter(1000)
    meter.record('render', 3, 100)
    meter.record('update', 0.5, 120)
    meter.record('update', 1.5, 220)
    const s = meter.snapshot(300)
    expect(s.render.perSecond).toBe(1)
    expect(s.update.perSecond).toBe(2)
    expect(s.update.meanMs).toBeCloseTo(1, 6)
  })

  it('sin muestras, todo a cero y sin NaN', () => {
    const s = createPerfMeter(1000).snapshot(5000)
    expect(s.render).toEqual({ perSecond: 0, meanMs: 0, maxMs: 0 })
    expect(s.update).toEqual({ perSecond: 0, meanMs: 0, maxMs: 0 })
  })

  it('si la ventana es más corta que un segundo, escala a «por segundo»', () => {
    const meter = createPerfMeter(500)
    meter.record('render', 1, 100)
    meter.record('render', 1, 200)
    expect(meter.snapshot(300).render.perSecond).toBe(4)
  })
})
