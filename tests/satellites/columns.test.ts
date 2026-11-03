import { describe, expect, it } from 'vitest'
import { CATEGORIES } from '../../src/satellites/categories'
import { ELEMENT_FIELDS, encodeColumns, parseColumns, recordAt, toOrbitInput } from '../../src/satellites/data/columns'
import { classified, stationRecords } from '../helpers/fixtures'

const records = stationRecords()
const entries = records.map((record, i) => classified(record, i < 10 ? 'stations' : 'weather', i === 4 ? { owner: 'CIS', type: 'DEB', status: '', launch: '2011-07-18' } : {}))
const columns = encodeColumns(entries)
const through = () => JSON.parse(JSON.stringify(columns)) as Record<string, unknown>

describe('encodeColumns', () => {
  it('un array por campo, todos de la misma longitud, y la tabla de categorías en el orden de la lista', () => {
    expect(columns.id).toEqual(records.map((r) => r.NORAD_CAT_ID))
    expect(columns.name).toHaveLength(20)
    expect(columns.categories.slice(0, CATEGORIES.length)).toEqual(CATEGORIES.map((c) => c.id))
    expect(columns.categories[columns.category[0]!]).toBe('stations')
    expect(columns.categories[columns.category[15]!]).toBe('weather')
  })

  it('una categoría que no está en la lista se añade al final de la tabla', () => {
    const odd = encodeColumns([classified(records[0]!, 'rara')])
    expect(odd.categories.at(-1)).toBe('rara')
    expect(odd.categories[odd.category[0]!]).toBe('rara')
  })

  it('guarda el propietario, el tipo, el estado y la fecha de lanzamiento de cada objeto', () => {
    expect(columns.owner[0]).toBe('US')
    expect(columns.type[0]).toBe('PAY')
    expect(columns.status[0]).toBe('+')
    expect(columns.launch[0]).toBe('2020-01-01')
    expect([columns.owner[4], columns.type[4], columns.status[4], columns.launch[4]]).toEqual(['CIS', 'DEB', '', '2011-07-18'])
  })

  it('sin objetos, columnas vacías', () => {
    expect(encodeColumns([]).id).toEqual([])
  })
})

describe('recordAt', () => {
  it('reconstruye cada registro tal como entró', () => {
    records.forEach((record, i) => expect(recordAt(columns, i)).toEqual(record))
  })
})

describe('parseColumns', () => {
  it('lee lo que se escribió: el JSON de ida y vuelta da las mismas columnas', () => {
    expect(parseColumns(through())).toEqual(columns)
  })

  it.each([
    ['algo que no es un objeto', () => 'x'],
    ['null', () => null],
    ['una columna ausente', () => { const c = through(); delete c.bstar; return c }],
    ['sin la columna del propietario (un catálogo de antes del SATCAT)', () => { const c = through(); delete c.owner; return c }],
    ['un tipo que no es texto', () => { const c = through(); ;(c.type as unknown[])[2] = 1; return c }],
    ['una columna que no es una lista', () => ({ ...through(), name: 'x' })],
    ['columnas de distinta longitud', () => ({ ...through(), id: [1, 2, 3] })],
    ['un número que no es finito (null en JSON)', () => { const c = through(); ;(c.bstar as unknown[])[3] = null; return c }],
    ['un nombre que no es texto', () => { const c = through(); ;(c.name as unknown[])[0] = 5; return c }],
    ['una categoría fuera de la tabla', () => { const c = through(); ;(c.category as number[])[0] = 99; return c }],
    ['una tabla de categorías que no es de textos', () => ({ ...through(), categories: [1, 2] })],
  ])('rechaza %s', (_motivo, make) => {
    expect(() => parseColumns(make())).toThrow(/catálogo/)
  })
})

describe('toOrbitInput', () => {
  const input = toOrbitInput(columns)

  it('ids, épocas y los nueve elementos de cada satélite seguidos, en el orden de ELEMENT_FIELDS', () => {
    expect(input.count).toBe(20)
    expect([...input.ids]).toEqual(columns.id)
    expect(input.epoch).toEqual(columns.epoch)
    expect(input.elements).toHaveLength(20 * ELEMENT_FIELDS.length)
    ELEMENT_FIELDS.forEach((field, k) => expect(input.elements[k]).toBe(records[0]![field] as number))
    expect(input.elements[ELEMENT_FIELDS.length]).toBe(records[1]!.MEAN_MOTION)
  })

  it('son copias: tocar el resultado no cambia las columnas (se transfieren al Worker)', () => {
    const copy = toOrbitInput(columns)
    copy.elements.fill(0)
    copy.ids.fill(0)
    expect(columns.meanMotion[0]).toBe(records[0]!.MEAN_MOTION)
    expect(columns.id[0]).toBe(records[0]!.NORAD_CAT_ID)
  })
})
