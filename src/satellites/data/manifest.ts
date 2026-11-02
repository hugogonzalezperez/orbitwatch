import type { AgeBand } from './freshness'

export interface ManifestSource {
  /** Grupo de CelesTrak del que sale el fichero. */
  group: string
  /** Nombre del fichero dentro de `data/`. */
  file: string
  count: number
}

interface Manifest {
  /** Cuándo se descargaron los datos de CelesTrak. */
  generatedAt: Date
  sources: ManifestSource[]
}

const FILE_PATTERN = /^[a-z0-9-]+\.json$/ // solo un nombre dentro de data/, sin rutas ni URL

const isSource = (value: unknown): value is ManifestSource => {
  const s = value as Partial<Record<keyof ManifestSource, unknown>> | null
  return (
    typeof s?.group === 'string' &&
    typeof s.file === 'string' &&
    FILE_PATTERN.test(s.file) &&
    typeof s.count === 'number' &&
    Number.isInteger(s.count) &&
    s.count >= 0
  )
}

export function parseManifest(json: unknown): Manifest {
  const raw = json as { generatedAt?: unknown; sources?: unknown } | null
  const generatedAt = typeof raw?.generatedAt === 'string' ? new Date(raw.generatedAt) : undefined
  if (!generatedAt || Number.isNaN(generatedAt.getTime())) throw new Error('El manifiesto no tiene un generatedAt válido')
  if (!Array.isArray(raw?.sources) || !raw.sources.every(isSource)) throw new Error('El manifiesto no tiene sources válidas')
  return { generatedAt, sources: raw.sources.map(({ group, file, count }) => ({ group, file, count })) }
}

export const serializeManifest = (generatedAt: Date, sources: ManifestSource[]): string =>
  `${JSON.stringify({ schemaVersion: 2, generatedAt: generatedAt.toISOString(), sources }, null, 2)}\n`

/** CelesTrak actualiza cada 2 h: hasta 3 h es normal, de 3 a 6 h aviso y desde 6 h desactualizado. */
export function dataFreshness(generatedAt: Date, now: Date): AgeBand {
  const hours = Math.max(0, now.getTime() - generatedAt.getTime()) / 3_600_000
  if (hours >= 6) return 'stale'
  return hours >= 3 ? 'aging' : 'ok'
}
