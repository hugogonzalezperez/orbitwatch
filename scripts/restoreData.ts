import { mkdir } from 'node:fs/promises'
import { sha256Hex } from '../src/shared/hash'
import { parseColumns } from '../src/satellites/data/columns'
import { parseManifest } from '../src/satellites/data/manifest'
import { writeAtomic } from './writeAtomic'

interface Options {
  /** Dirección del sitio publicado, por ejemplo `https://usuario.github.io/orbitwatch`. */
  baseUrl: string
  /** Carpeta donde dejar los datos (`public/data`). */
  out: string
  fetchImpl?: typeof fetch
}

/**
 * Trae del sitio publicado el último manifiesto y catálogo válidos, para cuando CelesTrak falla o solo cambia el código.
 * Comprueba hash y recuento, y no escribe nada si algo falla; el catálogo va antes que el manifiesto, que lo nombra.
 */
export async function restoreData({ baseUrl, out, fetchImpl = fetch }: Options) {
  const root = baseUrl.replace(/\/+$/, '')
  const get = async (path: string, init?: RequestInit): Promise<string> => {
    const response = await fetchImpl(`${root}/${path}`, init)
    if (response.status !== 200) throw new Error(`${path}: HTTP ${response.status}`)
    return response.text()
  }
  const manifestText = await get('data/manifest.json', { cache: 'no-store' })
  const manifest = parseManifest(JSON.parse(manifestText))
  const catalogText = await get(`data/${manifest.catalog.file}`)
  if ((await sha256Hex(catalogText)) !== manifest.catalog.sha256) throw new Error('el catálogo publicado no coincide con su hash')
  const objects = parseColumns(JSON.parse(catalogText)).id.length
  if (objects !== manifest.catalog.count) throw new Error(`el catálogo publicado trae ${objects} objetos y el manifiesto dice ${manifest.catalog.count}`)

  await mkdir(out, { recursive: true })
  await writeAtomic(out, manifest.catalog.file, catalogText)
  await writeAtomic(out, 'manifest.json', manifestText)
  return manifest
}
