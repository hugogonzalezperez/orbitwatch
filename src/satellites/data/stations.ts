import type { OMMJsonObject } from 'satellite.js'

export type OmmRecord = OMMJsonObject & { NORAD_CAT_ID: number }
const ISS_NORAD_ID = 25544

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

/** Busca la ISS en una lista OMM de CelesTrak y comprueba que sus elementos son números. */
export function findIss(json: unknown): OmmRecord {
  if (!Array.isArray(json)) throw new Error('Los datos no son una lista de objetos')
  const record = json.find((o): o is Record<string, unknown> => o?.NORAD_CAT_ID === ISS_NORAD_ID)
  if (!record) throw new Error(`No hay datos de la ISS (${ISS_NORAD_ID}) en la lista`)
  for (const field of NUMERIC_FIELDS) {
    if (typeof record[field] !== 'number' || !Number.isFinite(record[field])) {
      throw new Error(`${field} de la ISS no es un número`)
    }
  }
  const iss = record as OmmRecord
  if (typeof iss.EPOCH !== 'string' || Number.isNaN(epochDate(iss).getTime())) throw new Error('EPOCH de la ISS no es una fecha')
  return iss
}

/** CelesTrak da la época sin zona horaria: es UTC. */
export const epochDate = (record: OmmRecord): Date => new Date(`${record.EPOCH}Z`)
