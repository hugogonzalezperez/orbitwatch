import type { AgeBand } from './freshness'

interface Manifest {
  /** Cuándo se descargaron los datos de CelesTrak. */
  generatedAt: Date
}

export function parseManifest(json: unknown): Manifest {
  const raw = (json as { generatedAt?: unknown } | null)?.generatedAt
  const generatedAt = typeof raw === 'string' ? new Date(raw) : undefined
  if (!generatedAt || Number.isNaN(generatedAt.getTime())) throw new Error('El manifiesto no tiene un generatedAt válido')
  return { generatedAt }
}

/** CelesTrak actualiza cada 2 h: hasta 3 h es normal, de 3 a 6 h aviso y desde 6 h desactualizado. */
export function dataFreshness(generatedAt: Date, now: Date): AgeBand {
  const hours = Math.max(0, now.getTime() - generatedAt.getTime()) / 3_600_000
  if (hours >= 6) return 'stale'
  return hours >= 3 ? 'aging' : 'ok'
}
