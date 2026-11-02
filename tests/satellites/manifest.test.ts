import { describe, expect, it } from 'vitest'
import { dataFreshness, parseManifest } from '../../src/satellites/data/manifest'

describe('parseManifest', () => {
  it('lee la fecha de generación', () => {
    const manifest = parseManifest({ schemaVersion: 1, generatedAt: '2026-11-01T23:12:50Z' })
    expect(manifest.generatedAt.toISOString()).toBe('2026-11-01T23:12:50.000Z')
  })

  it('rechaza lo que no tiene una fecha válida', () => {
    expect(() => parseManifest({})).toThrow(/generatedAt/)
    expect(() => parseManifest({ generatedAt: 'ayer' })).toThrow(/generatedAt/)
    expect(() => parseManifest(null)).toThrow()
  })
})

describe('dataFreshness', () => {
  const generated = new Date('2026-11-01T12:00:00Z')
  const hoursLater = (h: number) => new Date(generated.getTime() + h * 3_600_000)

  it('normal hasta 3 h, aviso de 3 a 6 h, desactualizado desde 6 h', () => {
    expect(dataFreshness(generated, hoursLater(0))).toBe('ok')
    expect(dataFreshness(generated, hoursLater(2.99))).toBe('ok')
    expect(dataFreshness(generated, hoursLater(3))).toBe('aging')
    expect(dataFreshness(generated, hoursLater(5.99))).toBe('aging')
    expect(dataFreshness(generated, hoursLater(6))).toBe('stale')
  })

  it('una fecha de generación en el futuro cuenta como recién generada', () => {
    expect(dataFreshness(hoursLater(1), generated)).toBe('ok')
  })
})
