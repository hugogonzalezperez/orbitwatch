import { describe, expect, it } from 'vitest'
import { getCategory } from '../../src/satellites/categories'
import { buildCatalog, groupByCategory, normalize, rankResults, searchEntries } from '../../src/satellites/catalog'
import { encodeColumns } from '../../src/satellites/data/columns'
import type { OmmRecord } from '../../src/satellites/data/omm'
import { stationRecords } from '../helpers/fixtures'

const record = (id: number, name: string, designator = '2020-001A'): OmmRecord => ({ ...stationRecords()[0]!, NORAD_CAT_ID: id, OBJECT_NAME: name, OBJECT_ID: designator })

/** El catálogo de unas categorías con sus registros. */
const catalogOf = (groups: Array<{ name: string; records: OmmRecord[] }>) =>
  buildCatalog(encodeColumns(groups.flatMap((g) => g.records.map((r) => ({ record: r, category: g.name })))))

const catalog = catalogOf([
  { name: 'starlink', records: [record(3, 'STARLINK-1234'), record(1, 'STARLINK-30')] },
  { name: 'weather', records: [record(2, 'NOAA 19'), record(4, 'METEOSAT-9 (MSG-2)')] },
  { name: 'stations', records: [record(25544, 'ISS (ZARYA)', '1998-067A')] },
])

describe('getCategory', () => {
  it('conoce las categorías de los grupos y tiene una por defecto para los demás', () => {
    expect(getCategory('stations')).toMatchObject({ label: 'Estaciones y naves', kind: 'Estación o nave' })
    expect(getCategory('weather').label).toBe('Meteorología')
    expect(getCategory('starlink').label).toBe('Starlink')
    expect(getCategory('desconocido')).toMatchObject({ id: 'desconocido', label: 'desconocido', kind: 'Satélite' })
  })

  it('Starlink se dibuja más apagado que el resto: son miles y no deben tapar a los demás', () => {
    expect(getCategory('starlink').opacity).toBeLessThan(getCategory('weather').opacity)
  })
})

describe('buildCatalog', () => {
  it('ordena por categoría (estaciones, meteorología, Starlink) y por nombre dentro de cada una, con los números en orden natural', () => {
    expect(catalog.map((e) => e.name)).toEqual(['ISS (ZARYA)', 'METEOSAT-9 (MSG-2)', 'NOAA 19', 'STARLINK-30', 'STARLINK-1234'])
  })

  it('un nombre vacío se muestra con su número de catálogo', () => {
    expect(catalogOf([{ name: 'weather', records: [record(99, '')] }])[0]!.name).toBe('Sin nombre (99)')
  })
})

describe('normalize', () => {
  it('pasa a minúsculas y quita tildes', () => {
    expect(normalize('Meteorología ÁÉÍ')).toBe('meteorologia aei')
  })
})

describe('searchEntries', () => {
  const names = (query: string) => searchEntries(catalog, query).map((e) => e.name)

  it('sin consulta devuelve todo', () => {
    expect(searchEntries(catalog, '')).toBe(catalog)
    expect(searchEntries(catalog, '   ')).toBe(catalog)
  })

  it('busca por parte del nombre sin distinguir mayúsculas', () => {
    expect(names('noaa')).toEqual(['NOAA 19'])
    expect(names('STARLINK')).toEqual(['STARLINK-30', 'STARLINK-1234'])
  })

  it('con varias palabras deben aparecer todas, en cualquier orden', () => {
    expect(names('1234 starlink')).toEqual(['STARLINK-1234'])
    expect(names('starlink noaa')).toEqual([])
  })

  it('busca por número de catálogo y por designador internacional', () => {
    expect(names('25544')).toEqual(['ISS (ZARYA)'])
    expect(names('1998-067')).toEqual(['ISS (ZARYA)'])
  })

  it('no encuentra lo que no existe', () => {
    expect(names('zzz')).toEqual([])
  })
})

describe('groupByCategory', () => {
  it('agrupa en el orden del catálogo, sin categorías vacías, con su recuento', () => {
    const groups = groupByCategory(searchEntries(catalog, 'o'))
    expect(groups.map((g) => [g.category.id, g.entries.length])).toEqual([
      ['weather', 2], // METEOSAT y NOAA
    ])
    expect(groupByCategory(catalog).map((g) => g.category.id)).toEqual(['stations', 'weather', 'starlink'])
  })
})

describe('rankResults', () => {
  const big = catalogOf([
    {
      name: 'weather',
      records: [record(10, 'NOAA 19'), record(11, 'GOES 16 (NOAA)'), record(12, 'METOP-B'), record(13, 'FENGYUN 3A'), record(14, 'NOAA 20 (JPSS-1)')],
    },
    { name: 'starlink', records: [record(1234, 'STARLINK-1234'), record(5, 'STARLINK-5')] },
  ])
  const names = (query: string, limit = 8) => rankResults(big, query, limit).map((e) => e.name)

  it('primero los que empiezan por la consulta, después los que la contienen', () => {
    expect(names('noaa')).toEqual(['NOAA 19', 'NOAA 20 (JPSS-1)', 'GOES 16 (NOAA)'])
  })

  it('un número de catálogo exacto va el primero', () => {
    expect(names('5')[0]).toBe('STARLINK-5')
  })

  it('respeta el límite', () => {
    expect(names('a', 3)).toHaveLength(3)
  })

  it('sin consulta no devuelve nada: la paleta solo propone al escribir', () => {
    expect(names('')).toEqual([])
    expect(names('  ')).toEqual([])
  })

  it('sin coincidencias devuelve una lista vacía', () => {
    expect(names('zzz')).toEqual([])
  })
})
