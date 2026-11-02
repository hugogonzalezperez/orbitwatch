import { CATEGORIES } from '../categories'
import type { ClassifiedRecord } from './assemble'
import type { OmmRecord } from './omm'

/** Los nueve elementos numéricos de cada satélite, en este orden, tal como van al Worker. */
export const ELEMENT_FIELDS = [
  'MEAN_MOTION',
  'ECCENTRICITY',
  'INCLINATION',
  'RA_OF_ASC_NODE',
  'ARG_OF_PERICENTER',
  'MEAN_ANOMALY',
  'BSTAR',
  'MEAN_MOTION_DOT',
  'MEAN_MOTION_DDOT',
] as const

/**
 * Catálogo por columnas: un array por campo, y la fila `i` de todos ellos es el satélite `i`. Ocupa y comprime mucho
 * menos que una lista de objetos con las claves repetidas, y no obliga a crear un objeto por satélite al cargarlo.
 */
export interface CatalogColumns {
  /** Tabla de categorías: `category[i]` es una posición en esta lista. */
  categories: string[]
  category: number[]
  id: number[]
  name: string[]
  designator: string[]
  epoch: string[]
  meanMotion: number[]
  eccentricity: number[]
  inclination: number[]
  raan: number[]
  argPerigee: number[]
  meanAnomaly: number[]
  bstar: number[]
  ndot: number[]
  nddot: number[]
}

const NUMBER_COLUMNS = ['category', 'id', 'meanMotion', 'eccentricity', 'inclination', 'raan', 'argPerigee', 'meanAnomaly', 'bstar', 'ndot', 'nddot'] as const
const STRING_COLUMNS = ['name', 'designator', 'epoch'] as const
const ELEMENT_COLUMNS = ['meanMotion', 'eccentricity', 'inclination', 'raan', 'argPerigee', 'meanAnomaly', 'bstar', 'ndot', 'nddot'] as const

export function encodeColumns(entries: ClassifiedRecord[]): CatalogColumns {
  const categories: string[] = CATEGORIES.map((c) => c.id)
  const index = (id: string): number => {
    const known = categories.indexOf(id)
    return known === -1 ? categories.push(id) - 1 : known
  }
  const pick = (get: (record: OmmRecord) => string | number): number[] => entries.map((e) => Number(get(e.record)))
  return {
    categories,
    category: entries.map((e) => index(e.category)),
    id: pick((r) => r.NORAD_CAT_ID),
    name: entries.map((e) => e.record.OBJECT_NAME),
    designator: entries.map((e) => e.record.OBJECT_ID),
    epoch: entries.map((e) => e.record.EPOCH),
    meanMotion: pick((r) => r.MEAN_MOTION),
    eccentricity: pick((r) => r.ECCENTRICITY),
    inclination: pick((r) => r.INCLINATION),
    raan: pick((r) => r.RA_OF_ASC_NODE),
    argPerigee: pick((r) => r.ARG_OF_PERICENTER),
    meanAnomaly: pick((r) => r.MEAN_ANOMALY),
    bstar: pick((r) => r.BSTAR),
    ndot: pick((r) => r.MEAN_MOTION_DOT),
    nddot: pick((r) => r.MEAN_MOTION_DDOT),
  }
}

/** Comprueba la forma de lo leído (listas, longitudes, tipos); el contenido ya lo validó el script de datos al escribirlo. */
export function parseColumns(json: unknown): CatalogColumns {
  const fail = (reason: string): never => {
    throw new Error(`El catálogo no es válido: ${reason}`)
  }
  if (typeof json !== 'object' || json === null) return fail('no es un objeto')
  const raw = json as Record<string, unknown>
  const list = (key: string): unknown[] => {
    const value = raw[key]
    return Array.isArray(value) ? value : fail(`falta la columna «${key}»`)
  }
  const categories = list('categories')
  if (!categories.every((c) => typeof c === 'string')) fail('la tabla de categorías no es de textos')
  const length = list('id').length
  for (const key of NUMBER_COLUMNS) {
    const column = list(key)
    if (column.length !== length) fail(`la columna «${key}» tiene otra longitud`)
    if (!column.every((v) => typeof v === 'number' && Number.isFinite(v))) fail(`la columna «${key}» tiene un valor que no es un número`)
  }
  for (const key of STRING_COLUMNS) {
    const column = list(key)
    if (column.length !== length) fail(`la columna «${key}» tiene otra longitud`)
    if (!column.every((v) => typeof v === 'string')) fail(`la columna «${key}» tiene un valor que no es texto`)
  }
  if (!(raw.category as number[]).every((c) => Number.isInteger(c) && c >= 0 && c < categories.length)) fail('una categoría no está en la tabla')
  return raw as unknown as CatalogColumns
}

/** El registro del satélite `i`, con la forma que espera `json2satrec`. */
export function recordAt(c: CatalogColumns, i: number): OmmRecord {
  return {
    OBJECT_NAME: c.name[i]!,
    OBJECT_ID: c.designator[i]!,
    EPOCH: c.epoch[i]!,
    NORAD_CAT_ID: c.id[i]!,
    MEAN_MOTION: c.meanMotion[i]!,
    ECCENTRICITY: c.eccentricity[i]!,
    INCLINATION: c.inclination[i]!,
    RA_OF_ASC_NODE: c.raan[i]!,
    ARG_OF_PERICENTER: c.argPerigee[i]!,
    MEAN_ANOMALY: c.meanAnomaly[i]!,
    BSTAR: c.bstar[i]!,
    MEAN_MOTION_DOT: c.ndot[i]!,
    MEAN_MOTION_DDOT: c.nddot[i]!,
  } as OmmRecord
}

/** Lo que el Worker necesita para calcular: sin nombres ni categorías, y con los números en arrays tipados que se pueden transferir. */
export interface OrbitInput {
  count: number
  ids: Uint32Array
  epoch: string[]
  /** `ELEMENT_FIELDS.length` números por satélite, uno detrás de otro. */
  elements: Float64Array
}

export function toOrbitInput(c: CatalogColumns): OrbitInput {
  const count = c.id.length
  const elements = new Float64Array(count * ELEMENT_COLUMNS.length)
  ELEMENT_COLUMNS.forEach((key, k) => {
    for (let i = 0; i < count; i++) elements[i * ELEMENT_COLUMNS.length + k] = c[key][i]!
  })
  return { count, ids: Uint32Array.from(c.id), epoch: [...c.epoch], elements }
}
