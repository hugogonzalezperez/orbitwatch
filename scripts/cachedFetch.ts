import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface Options {
  /** Carpeta donde se guardan las respuestas (se crea si no existe). */
  dir: string
  /** Edad máxima de una respuesta guardada; pasada, se vuelve a descargar. */
  maxAgeMs: number
  fetchImpl?: typeof fetch
}

/**
 * Un `fetch` que no repite una descarga reciente: CelesTrak pide una sola descarga por actualización (cada 2 h) y así
 * ejecutar el script varias veces seguidas no la incumple. Solo guarda los 200; lo demás se devuelve tal cual.
 */
export function createCachedFetch({ dir, maxAgeMs, fetchImpl = fetch }: Options): typeof fetch {
  return async (input, init) => {
    const url = String(input)
    const file = join(dir, `${createHash('sha256').update(url).digest('hex').slice(0, 16)}.json`)
    try {
      if (Date.now() - statSync(file).mtimeMs < maxAgeMs) return new Response(readFileSync(file))
    } catch {
      // no hay copia guardada
    }
    const response = await fetchImpl(input, init)
    if (response.status === 200) {
      mkdirSync(dir, { recursive: true })
      writeFileSync(file, Buffer.from(await response.clone().arrayBuffer()))
    }
    return response
  }
}
