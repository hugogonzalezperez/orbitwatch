import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../../src/satellites/categories'
import { assembleCatalog, classify } from '../../src/satellites/data/assemble'
import { DATA_GROUPS } from '../../src/satellites/data/groups'
import type { OmmRecord } from '../../src/satellites/data/omm'
import { stationRecords } from '../helpers/fixtures'

const record = (id: number, patch: Partial<OmmRecord> = {}): OmmRecord => ({ ...stationRecords()[0]!, NORAD_CAT_ID: id, OBJECT_NAME: `OBJ ${id}`, ...patch })
const group = (name: string, ...records: OmmRecord[]) => ({ name, records, rejected: 0 })

describe('classify', () => {
  it('toma la primera categoría de la lista que tiene alguno de los grupos del objeto', () => {
    expect(classify(['starlink', 'active'])).toBe('starlink')
    expect(classify(['active', 'geo', 'weather'])).toBe('weather') // meteorología va antes que geoestacionarios
    expect(classify(['cubesat', 'amateur'])).toBe('amateur')
  })

  it('un activo que no está en ningún otro grupo es «otros»', () => {
    expect(classify(['active'])).toBe('other')
  })

  it('los restos de colisiones tienen su categoría', () => {
    expect(classify(['cosmos-2251-debris'])).toBe('debris')
    expect(classify(['fengyun-1c-debris'])).toBe('debris')
  })

  it('un grupo desconocido cae en «otros»', () => {
    expect(classify(['no-existe'])).toBe('other')
  })
})

describe('assembleCatalog', () => {
  it('un objeto presente en varios grupos aparece una sola vez, con la categoría de mayor prioridad', () => {
    const iss = record(25544)
    const entries = assembleCatalog([group('active', iss, record(2)), group('stations', iss), group('geo', record(2))])
    expect(entries).toHaveLength(2)
    expect(entries.find((e) => e.record.NORAD_CAT_ID === 25544)!.category).toBe('stations')
    expect(entries.find((e) => e.record.NORAD_CAT_ID === 2)!.category).toBe('geo')
  })

  it('si dos grupos traen el mismo objeto con distinta época, se queda con la más reciente', () => {
    const old = record(5, { EPOCH: '2026-11-01T00:00:00.000000' })
    const recent = record(5, { EPOCH: '2026-11-02T00:00:00.000000' })
    expect(assembleCatalog([group('active', old), group('weather', recent)])[0]!.record.EPOCH).toBe('2026-11-02T00:00:00.000000')
    expect(assembleCatalog([group('active', recent), group('weather', old)])[0]!.record.EPOCH).toBe('2026-11-02T00:00:00.000000')
  })

  it('sale ordenado por número de catálogo, para que el mismo dato dé siempre el mismo fichero', () => {
    const ids = assembleCatalog([group('active', record(30), record(10), record(20))]).map((e) => e.record.NORAD_CAT_ID)
    expect(ids).toEqual([10, 20, 30])
  })

  it('sin grupos no hay objetos', () => {
    expect(assembleCatalog([])).toEqual([])
  })
})

describe('categorías y grupos a descargar', () => {
  it('cada categoría tiene identificador único, etiqueta y color, y solo los restos parten ocultos', () => {
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length)
    expect(CATEGORIES.every((c) => c.label.length > 0 && c.color > 0 && c.opacity > 0 && c.opacity <= 1)).toBe(true)
    expect(CATEGORIES.filter((c) => c.hiddenByDefault).map((c) => c.id)).toEqual(['debris'])
  })

  it('«otros» es la última categoría con activos y los restos van al final', () => {
    const ids = CATEGORIES.map((c) => c.id)
    expect(ids.at(-1)).toBe('debris')
    expect(ids.at(-2)).toBe('other')
  })

  it('los grupos a descargar no se repiten, incluyen todos los de las categorías y cada uno tiene un mínimo positivo', () => {
    const names = DATA_GROUPS.map((g) => g.name)
    expect(new Set(names).size).toBe(names.length)
    for (const category of CATEGORIES) for (const g of category.groups) expect(names).toContain(g)
    expect(DATA_GROUPS.every((g) => g.minObjects > 0)).toBe(true)
  })
})
