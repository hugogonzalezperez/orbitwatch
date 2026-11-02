import type { OMMJsonObject } from 'satellite.js'

/** Registro OMM reducido a lo que SGP4 y la interfaz necesitan, con la forma que espera `json2satrec`. */
export type OmmRecord = OMMJsonObject & { NORAD_CAT_ID: number }

export interface ParsedOmm {
  records: OmmRecord[]
  /** Registros descartados por no ser válidos. */
  rejected: number
}

const NUMERIC_FIELDS = [
  'NORAD_CAT_ID',
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

const MIN_VALID_SHARE = 0.95 // por debajo, el formato de CelesTrak ha podido cambiar

/** CelesTrak da la época sin zona horaria: es UTC. */
export const epochDate = (record: OmmRecord): Date => new Date(`${record.EPOCH}Z`)

const text = (value: unknown): string => (typeof value === 'string' ? value : '') // CelesTrak puede dejarlos vacíos o nulos

function toRecord(raw: unknown): OmmRecord | null {
  if (typeof raw !== 'object' || raw === null) return null
  const source = raw as Record<string, unknown>
  const numbers: Record<string, number> = {}
  for (const field of NUMERIC_FIELDS) {
    const value = source[field]
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    numbers[field] = value
  }
  if (typeof source.EPOCH !== 'string' || Number.isNaN(Date.parse(`${source.EPOCH}Z`))) return null // una época futura sí vale
  const { ECCENTRICITY, MEAN_MOTION, INCLINATION } = numbers
  if (ECCENTRICITY! < 0 || ECCENTRICITY! >= 1 || MEAN_MOTION! <= 0 || INCLINATION! < 0 || INCLINATION! > 180) return null
  return { OBJECT_NAME: text(source.OBJECT_NAME), OBJECT_ID: text(source.OBJECT_ID), EPOCH: source.EPOCH, ...numbers } as OmmRecord
}

/** Valida cada registro de una lista OMM en JSON y descarta los que no valen. */
export function parseOmmList(json: unknown): ParsedOmm {
  if (!Array.isArray(json)) throw new Error('Los datos no son una lista de objetos')
  const records: OmmRecord[] = []
  for (const raw of json) {
    const record = toRecord(raw)
    if (record) records.push(record)
  }
  return { records, rejected: json.length - records.length }
}

/** Rechaza el conjunto entero si faltan objetos o se descartó demasiado: es mejor no publicar que publicar a medias. */
export function assertHealthy({ records, rejected }: ParsedOmm, minObjects: number): void {
  if (records.length < minObjects) throw new Error(`Solo hay ${records.length} objetos válidos; se esperaban al menos ${minObjects}`)
  const total = records.length + rejected
  if (records.length / total < MIN_VALID_SHARE) {
    throw new Error(`Se descartó el ${Math.round((rejected / total) * 100)} % de los objetos: el formato de CelesTrak ha podido cambiar`)
  }
}
