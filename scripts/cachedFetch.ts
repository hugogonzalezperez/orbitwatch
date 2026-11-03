import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface Options {
  /** Carpeta donde se guardan las respuestas (se crea si no existe). */
  dir: string
  /** Edad máxima de una respuesta guardada, igual para todas o según la dirección; pasada, se vuelve a descargar. */
  maxAgeMs: number | ((url: string) => number)
  fetchImpl?: typeof fetch
  now?: () => number
}

/**
 * Un `fetch` que no repite una descarga reciente: CelesTrak pide una sola descarga por actualización y así ejecutar el
 * script varias veces seguidas no la incumple. Solo guarda los 200; lo demás se devuelve tal cual. La edad sale de una marca
 * de tiempo propia y no de la fecha del fichero, que una caché restaurada en integración continua puede haber reiniciado.
 */
export function createCachedFetch({ dir, maxAgeMs, fetchImpl = fetch, now = Date.now }: Options): typeof fetch {
  return async (input, init) => {
    const url = String(input)
    const base = join(dir, createHash('sha256').update(url).digest('hex').slice(0, 16))
    const maxAge = typeof maxAgeMs === 'function' ? maxAgeMs(url) : maxAgeMs
    try {
      const fetchedAt = Number(readFileSync(`${base}.at`, 'utf8'))
      if (Number.isFinite(fetchedAt) && now() - fetchedAt < maxAge) return new Response(readFileSync(`${base}.json`))
    } catch {
      // no hay copia guardada, o está a medias
    }
    const response = await fetchImpl(input, init)
    if (response.status === 200) {
      mkdirSync(dir, { recursive: true })
      writeFileSync(`${base}.json`, Buffer.from(await response.clone().arrayBuffer()))
      writeFileSync(`${base}.at`, String(now()))
    }
    return response
  }
}
