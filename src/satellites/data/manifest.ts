export interface ManifestCatalog {
  /** Nombre del fichero del catálogo dentro de `data/`; lleva el hash, así que cada versión tiene el suyo. */
  file: string
  count: number
  /** SHA-256 del contenido del fichero, para comprobar que llegó entero. */
  sha256: string
}

interface Manifest {
  /** Cuándo se descargaron los datos de CelesTrak. */
  generatedAt: Date
  catalog: ManifestCatalog
}

export const SCHEMA_VERSION = 4 // 4: el catálogo trae propietario, tipo, estado y fecha de lanzamiento (SATCAT)
export const FILE_PATTERN = /^catalog\.[0-9a-f]{8}\.json$/ // solo un nombre dentro de data/, sin rutas ni URL
const SHA_PATTERN = /^[0-9a-f]{64}$/

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0

const isCatalog = (value: unknown): value is ManifestCatalog => {
  const c = value as Partial<Record<keyof ManifestCatalog, unknown>> | null
  return typeof c?.file === 'string' && FILE_PATTERN.test(c.file) && isCount(c.count) && typeof c.sha256 === 'string' && SHA_PATTERN.test(c.sha256)
}

export function parseManifest(json: unknown): Manifest {
  const raw = json as { schemaVersion?: unknown; generatedAt?: unknown; catalog?: unknown } | null
  if (raw?.schemaVersion !== SCHEMA_VERSION) throw new Error(`El manifiesto es de otra versión del formato (se espera la ${SCHEMA_VERSION})`)
  const generatedAt = typeof raw.generatedAt === 'string' ? new Date(raw.generatedAt) : undefined
  if (!generatedAt || Number.isNaN(generatedAt.getTime())) throw new Error('El manifiesto no tiene un generatedAt válido')
  if (!isCatalog(raw.catalog)) throw new Error('El manifiesto no tiene un catálogo válido')
  return { generatedAt, catalog: { ...raw.catalog } }
}

export const catalogFileName = (sha256: string): string => `catalog.${sha256.slice(0, 8)}.json`

export const serializeManifest = (generatedAt: Date, catalog: ManifestCatalog): string =>
  `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, generatedAt: generatedAt.toISOString(), catalog }, null, 2)}\n`
