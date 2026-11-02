import type { GroupSpec } from './fetchGroups'
import type { OmmRecord } from './omm'

/** `stations` aporta la ISS; el resto se dibuja como enjambre. Mínimos holgados: solo detectan una respuesta rota. */
export const DATA_GROUPS: GroupSpec[] = [
  { name: 'stations', minObjects: 3 },
  { name: 'weather', minObjects: 10 },
  { name: 'starlink', minObjects: 1000 },
]

const ISS_NORAD_ID = 25544

export function findIss(records: OmmRecord[]): OmmRecord {
  const iss = records.find((r) => r.NORAD_CAT_ID === ISS_NORAD_ID)
  if (!iss) throw new Error(`No hay datos de la ISS (${ISS_NORAD_ID}) en la lista`)
  return iss
}
