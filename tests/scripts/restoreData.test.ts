import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { restoreData } from '../../scripts/restoreData'
import { encodeColumns } from '../../src/satellites/data/columns'
import { catalogFileName, serializeManifest } from '../../src/satellites/data/manifest'
import { sha256Hex } from '../../src/shared/hash'
import { stationRecords } from '../helpers/fixtures'

const BASE = 'https://ejemplo.github.io/orbitwatch'
const catalogText = JSON.stringify(encodeColumns(stationRecords().map((record) => ({ record, category: 'stations' }))))
const sha256 = await sha256Hex(catalogText)
const file = catalogFileName(sha256)
const manifestText = serializeManifest(new Date('2026-11-02T20:00:00Z'), { file, count: 20, sha256 }, [{ group: 'stations', count: 20 }])

let out: string
beforeEach(() => void (out = mkdtempSync(join(tmpdir(), 'orbitwatch-restore-'))))
afterEach(() => rmSync(out, { recursive: true, force: true }))

/** Un sitio publicado falso: responde por ruta y registra qué se pidió y con qué opciones. */
const site = (files: Record<string, string | number>) => {
  const requests: Array<{ url: string; init?: RequestInit }> = []
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), init })
    const body = files[String(input).replace(`${BASE}/`, '')]
    if (typeof body === 'number') return new Response('', { status: body })
    return body === undefined ? new Response('', { status: 404 }) : new Response(body)
  }) as typeof fetch
  return { fetchImpl, requests }
}
const published = { 'data/manifest.json': manifestText, [`data/${file}`]: catalogText }

describe('restoreData', () => {
  it('descarga el manifiesto y el catálogo del sitio publicado y los deja en la carpeta de datos', async () => {
    const { fetchImpl } = site(published)
    const manifest = await restoreData({ baseUrl: BASE, out, fetchImpl })
    expect(manifest.catalog).toMatchObject({ file, count: 20, sha256 })
    expect(readFileSync(join(out, 'manifest.json'), 'utf8')).toBe(manifestText)
    expect(readFileSync(join(out, file), 'utf8')).toBe(catalogText)
  })

  it('acepta la dirección con o sin barra final', async () => {
    await restoreData({ baseUrl: `${BASE}/`, out, fetchImpl: site(published).fetchImpl })
    expect(existsSync(join(out, 'manifest.json'))).toBe(true)
  })

  it('pide el manifiesto sin usar la caché del navegador ni de intermediarios', async () => {
    const { fetchImpl, requests } = site(published)
    await restoreData({ baseUrl: BASE, out, fetchImpl })
    expect(requests[0]!.init?.cache).toBe('no-store')
  })

  it.each([
    ['el sitio aún no existe (404 en el manifiesto)', {}],
    ['el manifiesto no es válido', { 'data/manifest.json': '{"schemaVersion": 1}' }],
    ['el catálogo falta (404)', { 'data/manifest.json': manifestText }],
    ['el servidor falla con un 500', { 'data/manifest.json': 500 }],
    ['el catálogo no coincide con su hash', { ...published, [`data/${file}`]: catalogText.replace('ISS (ZARYA)', 'ISS (ZARYB)') }],
    ['el catálogo tiene otro número de objetos que el manifiesto', { ...published, 'data/manifest.json': manifestText.replace('"count": 20', '"count": 21') }],
  ])('si %s, falla y no deja nada escrito', async (_motivo, files) => {
    await expect(restoreData({ baseUrl: BASE, out, fetchImpl: site(files).fetchImpl })).rejects.toThrow()
    expect(readdirSync(out)).toEqual([])
  })
})
