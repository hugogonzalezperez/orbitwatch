import type { AgeBand } from './freshness'

export interface ManifestCatalog {
  /** Nombre del fichero del catálogo dentro de `data/`; lleva el hash, así que cada versión tiene el suyo. */
  file: string
  count: number
  /** SHA-256 del contenido del fichero, para comprobar que llegó entero. */
  sha256: string
}

export interface ManifestGroup {
  /** Grupo de CelesTrak y objetos que trajo, antes de unirlos en el catálogo. */
  group: string
  count: number
}

interface Manifest {
  /** Cuándo se descargaron los datos de CelesTrak. */
  generatedAt: Date
  catalog: ManifestCatalog
  groups: ManifestGroup[]
}

export const SCHEMA_VERSION = 3
const FILE_PATTERN = /^catalog\.[0-9a-f]{8}\.json$/ // solo un nombre dentro de data/, sin rutas ni URL
const SHA_PATTERN = /^[0-9a-f]{64}$/

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0

const isCatalog = (value: unknown): value is ManifestCatalog => {
  const c = value as Partial<Record<keyof ManifestCatalog, unknown>> | null
  return typeof c?.file === 'string' && FILE_PATTERN.test(c.file) && isCount(c.count) && typeof c.sha256 === 'string' && SHA_PATTERN.test(c.sha256)
}

const isGroup = (value: unknown): value is ManifestGroup => {
  const g = value as Partial<Record<keyof ManifestGroup, unknown>> | null
  return typeof g?.group === 'string' && isCount(g.count)
}

export function parseManifest(json: unknown): Manifest {
  const raw = json as { schemaVersion?: unknown; generatedAt?: unknown; catalog?: unknown; groups?: unknown } | null
  if (raw?.schemaVersion !== SCHEMA_VERSION) throw new Error(`El manifiesto es de otra versión del formato (se espera la ${SCHEMA_VERSION})`)
  const generatedAt = typeof raw.generatedAt === 'string' ? new Date(raw.generatedAt) : undefined
  if (!generatedAt || Number.isNaN(generatedAt.getTime())) throw new Error('El manifiesto no tiene un generatedAt válido')
  if (!isCatalog(raw.catalog)) throw new Error('El manifiesto no tiene un catálogo válido')
  if (!Array.isArray(raw.groups) || !raw.groups.every(isGroup)) throw new Error('El manifiesto no tiene una lista de grupos válida')
  return { generatedAt, catalog: { ...raw.catalog }, groups: raw.groups.map(({ group, count }) => ({ group, count })) }
}

export const catalogFileName = (sha256: string): string => `catalog.${sha256.slice(0, 8)}.json`

export const serializeManifest = (generatedAt: Date, catalog: ManifestCatalog, groups: ManifestGroup[]): string =>
  `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, generatedAt: generatedAt.toISOString(), catalog, groups }, null, 2)}\n`

/** CelesTrak actualiza cada 2 h: hasta 3 h es normal, de 3 a 6 h aviso y desde 6 h desactualizado. */
export function dataFreshness(generatedAt: Date, now: Date): AgeBand {
  const hours = Math.max(0, now.getTime() - generatedAt.getTime()) / 3_600_000
  if (hours >= 6) return 'stale'
  return hours >= 3 ? 'aging' : 'ok'
}
