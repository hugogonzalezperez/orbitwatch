import { describe, expect, it } from 'vitest'
import { parseStartTime } from '../../src/app/startTime'

describe('parseStartTime', () => {
  it('lee ?t= con una fecha ISO', () => {
    expect(parseStartTime('?t=2026-03-20T14:46:00Z')?.toISOString()).toBe('2026-03-20T14:46:00.000Z')
  })
  it('sin parámetro, o con una fecha inválida, devuelve undefined', () => {
    expect(parseStartTime('')).toBeUndefined()
    expect(parseStartTime('?x=1')).toBeUndefined()
    expect(parseStartTime('?t=mañana')).toBeUndefined()
  })
})
