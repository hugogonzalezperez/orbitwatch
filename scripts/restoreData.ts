import { mkdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { sha256Hex } from '../src/shared/hash'
import { parseColumns } from '../src/satellites/data/columns'
import { parseManifest } from '../src/satellites/data/manifest'

interface Options {
  /** Dirección del sitio publicado, por ejemplo `https://usuario.github.io/orbitwatch`. */
  baseUrl: string
  /** Carpeta donde dejar los datos (`public/data`). */
  out: string
  fetchImpl?: typeof fetch
}

/**
 * Trae del sitio ya publicado el último manifiesto y catálogo válidos. Sirve cuando CelesTrak no responde (no se sirven datos
 * a medias: se republica lo último bueno) o cuando solo cambia el código y no toca descargar otra vez. Comprueba el hash y el
 * recuento, y no escribe nada si algo falla; el catálogo se escribe antes que el manifiesto, que es lo que lo nombra.
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
  for (const [name, text] of [[manifest.catalog.file, catalogText], ['manifest.json', manifestText]] as const) {
    await writeFile(join(out, `${name}.tmp`), text)
    await rename(join(out, `${name}.tmp`), join(out, name))
  }
  return manifest
}
