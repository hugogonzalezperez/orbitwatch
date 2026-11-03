import { CATEGORIES, NAME_RULES } from '../categories'
import type { GroupData } from './fetchGroups'
import { epochDate, type OmmRecord } from './omm'
import type { ObjectType, SatcatRow } from './satcat'

export interface ClassifiedRecord {
  record: OmmRecord
  category: string
  /** Código del propietario o país (SATCAT); vacío si el SATCAT no trae el objeto. */
  owner: string
  type: ObjectType
  /** Código de estado operativo; vacío en los restos y si no se conoce. */
  status: string
  /** Fecha de lanzamiento, AAAA-MM-DD; vacía si no se conoce. */
  launch: string
}

/**
 * La categoría de un objeto. Un resto o un cuerpo de cohete (tipo del SATCAT) va a «restos» esté en el grupo que esté; si no,
 * manda el primer grupo de la lista de categorías. El nombre solo se mira si es «otros» o si el objeto está en `satnogs` y no
 * en `amateur` (SatNOGS sigue también satélites meteorológicos y de otras funciones).
 */
export function classify({ groups, name, type }: { groups: readonly string[]; name: string; type: ObjectType }): string {
  if (type === 'DEB' || type === 'R/B') return 'debris'
  const byGroup = CATEGORIES.find((c) => c.groups.some((g) => groups.includes(g)))?.id ?? 'other'
  const onlySatnogs = byGroup === 'amateur' && !groups.includes('amateur')
  if (byGroup !== 'other' && !onlySatnogs) return byGroup
  return NAME_RULES.find((rule) => rule.pattern.test(name))?.category ?? byGroup
}

/** Un registro por número de catálogo (el de época más reciente), con su categoría y el SATCAT, ordenado por número: los mismos datos dan el mismo fichero. */
export function assembleCatalog(data: GroupData[], satcat: ReadonlyMap<number, SatcatRow>): ClassifiedRecord[] {
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
    .map(({ record, groups }): ClassifiedRecord => {
      const row = satcat.get(record.NORAD_CAT_ID)
      const type = row?.type ?? 'UNK'
      return {
        record,
        category: classify({ groups, name: record.OBJECT_NAME, type }),
        owner: row?.owner ?? '',
        type,
        status: row?.status ?? '',
        launch: row?.launch ?? '',
      }
    })
    .sort((a, b) => a.record.NORAD_CAT_ID - b.record.NORAD_CAT_ID)
}
