import { describe, expect, it } from 'vitest'
import { dataFreshness, parseManifest, serializeManifest } from '../../src/satellites/data/manifest'

const sources = [
  { group: 'stations', file: 'stations.json', count: 20 },
  { group: 'weather', file: 'weather.json', count: 70 },
]

describe('parseManifest', () => {
  it('lee la fecha de generación y las fuentes', () => {
    const manifest = parseManifest({ schemaVersion: 2, generatedAt: '2026-11-01T23:12:50Z', sources })
    expect(manifest.generatedAt.toISOString()).toBe('2026-11-01T23:12:50.000Z')
    expect(manifest.sources).toEqual(sources)
  })

  it('rechaza lo que no tiene una fecha válida', () => {
    expect(() => parseManifest({ sources })).toThrow(/generatedAt/)
    expect(() => parseManifest({ generatedAt: 'ayer', sources })).toThrow(/generatedAt/)
    expect(() => parseManifest(null)).toThrow()
  })

  it('rechaza un manifiesto sin fuentes o con una fuente mal formada', () => {
    const generatedAt = '2026-11-01T23:12:50Z'
    expect(() => parseManifest({ generatedAt })).toThrow(/sources/)
    expect(() => parseManifest({ generatedAt, sources: [{ group: 'x', file: 'x.json' }] })).toThrow(/sources/)
    expect(() => parseManifest({ generatedAt, sources: [{ group: 'x', file: 'x.json', count: -1 }] })).toThrow(/sources/)
  })

  it.each(['../secreto.json', 'a/b.json', 'datos.txt', 'https://otro.sitio/x.json', ''])('rechaza el nombre de fichero %j', (file) => {
    expect(() => parseManifest({ generatedAt: '2026-11-01T23:12:50Z', sources: [{ group: 'x', file, count: 1 }] })).toThrow(/sources/)
  })
})

describe('serializeManifest', () => {
  it('se lee de vuelta tal cual', () => {
    const generatedAt = new Date('2026-11-01T23:12:50Z')
    const manifest = parseManifest(JSON.parse(serializeManifest(generatedAt, sources)))
    expect(manifest).toEqual({ generatedAt, sources })
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
