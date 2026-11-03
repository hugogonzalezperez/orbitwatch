import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../../src/satellites/categories'
import { assembleCatalog, classify } from '../../src/satellites/data/assemble'
import { cacheMaxAgeMs, DATA_GROUPS } from '../../src/satellites/data/groups'
import type { OmmRecord } from '../../src/satellites/data/omm'
import { SATCAT_URL, type SatcatRow } from '../../src/satellites/data/satcat'
import { stationRecords } from '../helpers/fixtures'

const record = (id: number, patch: Partial<OmmRecord> = {}): OmmRecord => ({ ...stationRecords()[0]!, NORAD_CAT_ID: id, OBJECT_NAME: `OBJ ${id}`, ...patch })
const group = (name: string, ...records: OmmRecord[]) => ({ name, records, rejected: 0 })
const satcatOf = (rows: Record<number, Partial<SatcatRow>>) =>
  new Map(Object.entries(rows).map(([id, row]) => [Number(id), { type: 'PAY' as const, status: '+', owner: 'US', launch: '2020-01-01', ...row }]))
const of = (groups: string[], name = 'X', type: SatcatRow['type'] = 'PAY') => classify({ groups, name, type })

describe('classify: por grupos', () => {
  it('toma la primera categoría de la lista que tiene alguno de los grupos del objeto', () => {
    expect(of(['starlink', 'active'])).toBe('starlink')
    expect(of(['active', 'geo', 'weather'])).toBe('weather') // meteorología va antes que comunicaciones
    expect(of(['cubesat', 'amateur'])).toBe('amateur')
  })

  it('los grupos de las constelaciones nuevas y los de comunicaciones tienen su categoría', () => {
    for (const g of ['kuiper', 'qianfan', 'hulianwang', 'oneweb']) expect(of([g, 'active']), g).toBe('constellations')
    for (const g of ['intelsat', 'ses', 'eutelsat', 'telesat', 'tdrss', 'other-comm', 'geo', 'sarsat']) expect(of([g, 'active']), g).toBe('communications')
    for (const g of ['spire', 'dmc', 'argos', 'planet']) expect(of([g, 'active']), g).toBe('earth-observation')
    for (const g of ['geodetic', 'engineering', 'education', 'radar']) expect(of([g, 'active']), g).toBe('science')
    expect(of(['sbas', 'active'])).toBe('navigation')
    expect(of(['satnogs', 'active'])).toBe('amateur')
  })

  it('un activo que no está en ningún otro grupo es «otros»', () => {
    expect(of(['active'])).toBe('other')
    expect(of(['no-existe'])).toBe('other')
  })
})

describe('classify: por tipo de objeto (SATCAT)', () => {
  it('un resto o un cuerpo de cohete va a «restos», esté en el grupo que esté', () => {
    expect(of(['stations'], 'FREGAT DEB', 'DEB')).toBe('debris')
    expect(of(['active'], 'CZ-2C R/B', 'R/B')).toBe('debris')
  })

  it('una carga útil en un grupo de restos (el propio satélite que se rompió) se queda con el grupo', () => {
    expect(of(['cosmos-2251-debris'], 'COSMOS 2251', 'PAY')).toBe('debris')
  })
})

describe('classify: por nombre, solo cuando los grupos no dicen nada', () => {
  it.each([
    ['NAVSTAR 43 (USA 132)', 'navigation'],
    ['STARLINK-33000', 'starlink'],
    ['YAOGAN-30 A', 'earth-observation'],
    ['JILIN-1 GAOFEN 03D', 'earth-observation'],
    ['KINEIS-12', 'constellations'],
    ['TIANQI 22', 'constellations'],
    ['RASSVET-3', 'constellations'],
    ['GAOFEN-14', 'earth-observation'],
    ['LEMUR-2-DEANANDMAEVE', 'earth-observation'],
    ['TOMORROW-R1', 'weather'],
    ['SDA_T1TL-B', 'military'],
    ['PRAETORIAN-1', 'military'],
    ['SHIYAN-3 (SY-3)', 'science'],
  ])('%s sin grupo es «%s»', (name, category) => {
    expect(of(['active'], name)).toBe(category)
  })

  it('en `satnogs` y no en `amateur`, el nombre decide si lo reconoce, y si no se queda como radioaficionado', () => {
    expect(of(['satnogs'], 'NOAA 19')).toBe('weather')
    expect(of(['satnogs'], 'METEOR-M 2')).toBe('weather')
    expect(of(['satnogs'], 'ALGO RARO 5')).toBe('amateur')
    expect(of(['satnogs', 'amateur'], 'NOAA 19')).toBe('amateur')
  })

  it('un nombre nunca anula lo que dicen los grupos', () => {
    expect(of(['weather'], 'NAVSTAR 1')).toBe('weather')
    expect(of(['active', 'military'], 'STARLINK-1')).toBe('military')
  })

  it('un nombre cualquiera no cambia nada', () => {
    expect(of(['active'], 'ALGO RARO 5')).toBe('other')
  })
})

describe('assembleCatalog', () => {
  it('un objeto presente en varios grupos aparece una sola vez, con la categoría de mayor prioridad', () => {
    const iss = record(25544)
    const entries = assembleCatalog([group('active', iss, record(2)), group('stations', iss), group('geo', record(2))], new Map())
    expect(entries).toHaveLength(2)
    expect(entries.find((e) => e.record.NORAD_CAT_ID === 25544)!.category).toBe('stations')
    expect(entries.find((e) => e.record.NORAD_CAT_ID === 2)!.category).toBe('communications')
  })

  it('si dos grupos traen el mismo objeto con distinta época, se queda con la más reciente', () => {
    const old = record(5, { EPOCH: '2026-11-01T00:00:00.000000' })
    const recent = record(5, { EPOCH: '2026-11-02T00:00:00.000000' })
    expect(assembleCatalog([group('active', old), group('weather', recent)], new Map())[0]!.record.EPOCH).toBe('2026-11-02T00:00:00.000000')
    expect(assembleCatalog([group('active', recent), group('weather', old)], new Map())[0]!.record.EPOCH).toBe('2026-11-02T00:00:00.000000')
  })

  it('sale ordenado por número de catálogo, para que los mismos datos den siempre el mismo fichero', () => {
    const ids = assembleCatalog([group('active', record(30), record(10), record(20))], new Map()).map((e) => e.record.NORAD_CAT_ID)
    expect(ids).toEqual([10, 20, 30])
  })

  it('une cada objeto con su fila del SATCAT: propietario, tipo, estado y fecha de lanzamiento', () => {
    const [entry] = assembleCatalog([group('active', record(7))], satcatOf({ 7: { owner: 'PRC', status: 'P', launch: '2019-03-04' } }))
    expect(entry).toMatchObject({ owner: 'PRC', type: 'PAY', status: 'P', launch: '2019-03-04' })
  })

  it('el tipo del SATCAT decide la categoría: un resto en el grupo de las estaciones va a restos', () => {
    const [entry] = assembleCatalog([group('stations', record(8, { OBJECT_NAME: 'FREGAT DEB' }))], satcatOf({ 8: { type: 'DEB', status: '' } }))
    expect(entry!.category).toBe('debris')
  })

  it('un objeto que el SATCAT no trae queda con tipo desconocido y sin propietario, no se pierde', () => {
    const [entry] = assembleCatalog([group('active', record(9))], new Map())
    expect(entry).toMatchObject({ owner: '', type: 'UNK', status: '', launch: '' })
  })

  it('sin grupos no hay objetos', () => {
    expect(assembleCatalog([], new Map())).toEqual([])
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

describe('DATA_GROUPS', () => {
  it('todos los grupos tienen un mínimo de objetos propio: sin él, la comprobación de salud no valdría', () => {
    expect(DATA_GROUPS.every((g) => g.minObjects > 1)).toBe(true)
  })
})

describe('cacheMaxAgeMs', () => {
  it('los elementos de `active` se vuelven a pedir en cada ejecución de 2 h; el resto y el SATCAT, una vez al día', () => {
    const MIN = 60_000
    expect(cacheMaxAgeMs('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json')).toBe(100 * MIN)
    expect(cacheMaxAgeMs('https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json')).toBe(22 * 60 * MIN)
    expect(cacheMaxAgeMs(SATCAT_URL)).toBe(22 * 60 * MIN)
  })

  it('no confunde un grupo que contenga «active» en el nombre con `active`', () => {
    expect(cacheMaxAgeMs('https://celestrak.org/NORAD/elements/gp.php?GROUP=inactive&FORMAT=json')).toBe(22 * 60 * 60_000)
  })
})
