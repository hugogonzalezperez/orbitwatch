import { CATEGORIES } from '../categories'
import type { GroupData } from './fetchGroups'
import { epochDate, type OmmRecord } from './omm'

export interface ClassifiedRecord {
  record: OmmRecord
  category: string
}

/** La primera categoría (por prioridad) que tenga alguno de los grupos; «otros» si ninguna. */
export function classify(groupNames: readonly string[]): string {
  return CATEGORIES.find((c) => c.groups.some((g) => groupNames.includes(g)))?.id ?? 'other'
}

/**
 * Une los grupos descargados en un solo catálogo: un registro por número de catálogo (el de época más reciente si
 * varios grupos lo traen), con su categoría, ordenado por número para que los mismos datos den siempre el mismo fichero.
 */
export function assembleCatalog(data: GroupData[]): ClassifiedRecord[] {
  const byId = new Map<number, { record: OmmRecord; groups: string[] }>()
  for (const { name, records } of data) {
    for (const record of records) {
      const known = byId.get(record.NORAD_CAT_ID)
      if (!known) byId.set(record.NORAD_CAT_ID, { record, groups: [name] })
      else {
        known.groups.push(name)
        if (epochDate(record) > epochDate(known.record)) known.record = record
      }
    }
  }
  return [...byId.values()]
    .map(({ record, groups }) => ({ record, category: classify(groups) }))
    .sort((a, b) => a.record.NORAD_CAT_ID - b.record.NORAD_CAT_ID)
}
