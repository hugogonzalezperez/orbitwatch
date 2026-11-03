import { describe, expect, it } from 'vitest'
import { parseUtcInput, toUtcInput } from '../../src/ui/datetime'

describe('datetime-local en UTC', () => {
  it('escribe la hora UTC sin segundos', () => {
    expect(toUtcInput(new Date('2026-03-20T14:46:33Z'))).toBe('2026-03-20T14:46')
  })

  it('lee lo escrito como UTC, con o sin segundos', () => {
    expect(parseUtcInput('2026-03-20T14:46')?.toISOString()).toBe('2026-03-20T14:46:00.000Z')
    expect(parseUtcInput('2026-03-20T14:46:30')?.toISOString()).toBe('2026-03-20T14:46:30.000Z')
  })

  it.each(['', 'ayer', '2026-13-40T99:99', '2026-03-20'])('%j no es una hora', (value) => {
    expect(parseUtcInput(value)).toBeNull()
  })
})
