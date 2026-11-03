import { describe, expect, it } from 'vitest'
import { catalogFileName, parseManifest, serializeManifest } from '../../src/satellites/data/manifest'

const SHA = 'a1b2c3d4'.repeat(8)
const catalog = { file: `catalog.${SHA.slice(0, 8)}.json`, count: 17000, sha256: SHA }
const valid = { schemaVersion: 4, generatedAt: '2026-11-01T23:12:50Z', catalog }

describe('parseManifest', () => {
  it('lee la fecha de generación y el catálogo', () => {
    const manifest = parseManifest(valid)
    expect(manifest.generatedAt.toISOString()).toBe('2026-11-01T23:12:50.000Z')
    expect(manifest.catalog).toEqual(catalog)
  })

  it('rechaza lo que no tiene una fecha válida', () => {
    expect(() => parseManifest({ ...valid, generatedAt: undefined })).toThrow(/generatedAt/)
    expect(() => parseManifest({ ...valid, generatedAt: 'ayer' })).toThrow(/generatedAt/)
    expect(() => parseManifest(null)).toThrow()
  })

  it('rechaza otra versión del formato: un manifiesto viejo no debe leerse como si fuera el nuevo', () => {
    expect(() => parseManifest({ ...valid, schemaVersion: 3 })).toThrow(/versión/)
    expect(() => parseManifest({ ...valid, schemaVersion: undefined })).toThrow(/versión/)
  })

  it.each([
    ['sin catálogo', { catalog: undefined }],
    ['con un recuento negativo', { catalog: { ...catalog, count: -1 } }],
    ['con un hash que no es SHA-256', { catalog: { ...catalog, sha256: 'abc' } }],
  ])('rechaza un manifiesto %s', (_motivo, patch) => {
    expect(() => parseManifest({ ...valid, ...patch })).toThrow(/manifiesto/)
  })

  it.each(['../secreto.json', 'a/b.json', 'catalog.json', 'catalog.ABCDEF12.json', 'https://otro.sitio/x.json', ''])('rechaza el nombre de fichero %j', (file) => {
    expect(() => parseManifest({ ...valid, catalog: { ...catalog, file } })).toThrow(/manifiesto/)
  })
})

describe('catalogFileName', () => {
  it('lleva los 8 primeros caracteres del hash, para que un catálogo nuevo no se confunda con uno en caché', () => {
    expect(catalogFileName(SHA)).toBe('catalog.a1b2c3d4.json')
  })
})

describe('serializeManifest', () => {
  it('se lee de vuelta tal cual', () => {
    const generatedAt = new Date('2026-11-01T23:12:50Z')
    const manifest = parseManifest(JSON.parse(serializeManifest(generatedAt, catalog)))
    expect(manifest).toEqual({ generatedAt, catalog })
  })
})
