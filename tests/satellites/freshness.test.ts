import { describe, expect, it } from 'vitest'
import { ageBand, epochDistanceDays } from '../../src/satellites/data/freshness'

describe('epochDistanceDays', () => {
  const epoch = new Date('2026-11-01T00:00:00Z')

  it('es positivo si la hora simulada es posterior a la época y negativo si es anterior', () => {
    expect(epochDistanceDays(epoch, new Date('2026-11-03T12:00:00Z'))).toBe(2.5)
    expect(epochDistanceDays(epoch, new Date('2026-10-31T00:00:00Z'))).toBe(-1)
  })
})

describe('ageBand', () => {
  it('menos de 3 días es normal, de 3 a 7 es aviso y desde 7 es desactualizado', () => {
    expect(ageBand(0)).toBe('ok')
    expect(ageBand(2.99)).toBe('ok')
    expect(ageBand(3)).toBe('aging')
    expect(ageBand(6.99)).toBe('aging')
    expect(ageBand(7)).toBe('stale')
  })

  it('cuenta igual hacia el pasado que hacia el futuro', () => {
    expect(ageBand(-5)).toBe('aging')
    expect(ageBand(-10)).toBe('stale')
  })
})
