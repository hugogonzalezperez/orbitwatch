import { describe, expect, it } from 'vitest'
import { assertHealthy, epochDate, parseOmmList } from '../../src/satellites/data/omm'
import { stationsRaw } from '../helpers/fixtures'

const first = (stationsRaw as Array<Record<string, unknown>>)[0]!
const only = (patch: Record<string, unknown>) => parseOmmList([{ ...first, ...patch }])
const without = (field: string) => {
  const copy = { ...first }
  delete copy[field]
  return parseOmmList([copy])
}

describe('parseOmmList', () => {
  it('acepta los 20 objetos reales y conserva los números exactos', () => {
    const { records, rejected } = parseOmmList(stationsRaw)
    expect(records).toHaveLength(20)
    expect(rejected).toBe(0)
    expect(records[0]).toMatchObject({ OBJECT_NAME: 'ISS (ZARYA)', NORAD_CAT_ID: 25544, MEAN_MOTION: 15.49140766, BSTAR: 0.00013304 })
  })

  it('descarta los campos que no se usan', () => {
    expect(Object.keys(parseOmmList(stationsRaw).records[0]!).sort()).toEqual(
      ['ARG_OF_PERICENTER', 'BSTAR', 'ECCENTRICITY', 'EPOCH', 'INCLINATION', 'MEAN_ANOMALY', 'MEAN_MOTION', 'MEAN_MOTION_DDOT', 'MEAN_MOTION_DOT', 'NORAD_CAT_ID', 'OBJECT_ID', 'OBJECT_NAME', 'RA_OF_ASC_NODE'].sort(),
    )
  })

  it.each([
    ['falta un campo numérico', () => without('BSTAR')],
    ['un campo numérico es texto', () => only({ MEAN_MOTION: 'x' })],
    ['un campo numérico es nulo', () => only({ INCLINATION: null })],
    ['excentricidad 1 (órbita abierta)', () => only({ ECCENTRICITY: 1 })],
    ['excentricidad negativa', () => only({ ECCENTRICITY: -0.1 })],
    ['movimiento medio 0', () => only({ MEAN_MOTION: 0 })],
    ['inclinación mayor de 180°', () => only({ INCLINATION: 181 })],
    ['época que no es una fecha', () => only({ EPOCH: 'ayer' })],
    ['época ausente', () => without('EPOCH')],
  ])('rechaza el registro si %s', (_motivo, make) => {
    const parsed = make()
    expect(parsed.records).toHaveLength(0)
    expect(parsed.rejected).toBe(1)
  })

  it('acepta una época en el futuro (hay 2 reales en el grupo active)', () => {
    expect(only({ EPOCH: '2099-01-01T00:00:00.000000' }).records).toHaveLength(1)
  })

  it('un nombre o designador nulo o ausente se queda como cadena vacía', () => {
    const parsed = only({ OBJECT_NAME: null, OBJECT_ID: undefined })
    expect(parsed.records[0]).toMatchObject({ OBJECT_NAME: '', OBJECT_ID: '' })
  })

  it('rechaza lo que no es una lista', () => {
    expect(() => parseOmmList({})).toThrow(/lista/)
    expect(() => parseOmmList('a,b,c')).toThrow(/lista/)
  })
})

describe('assertHealthy', () => {
  const ok = { records: parseOmmList(stationsRaw).records, rejected: 0 }

  it('acepta un conjunto con suficientes objetos y casi todos válidos', () => {
    expect(() => assertHealthy(ok, 5)).not.toThrow()
  })

  it('rechaza un conjunto con menos objetos de los esperados', () => {
    expect(() => assertHealthy(ok, 1000)).toThrow(/al menos 1000/)
  })

  it('rechaza un conjunto en el que se descartó más del 5 %: el formato pudo cambiar', () => {
    expect(() => assertHealthy({ records: ok.records, rejected: 20 }, 5)).toThrow(/formato/)
  })

  it('tolera un rechazo bajo (1 de 100)', () => {
    expect(() => assertHealthy({ records: Array(99).fill(ok.records[0]), rejected: 1 }, 5)).not.toThrow()
  })
})

describe('epochDate', () => {
  it('lee la época como UTC', () => {
    expect(epochDate(parseOmmList(stationsRaw).records[0]!).toISOString()).toBe('2026-11-01T09:39:04.033Z')
  })
})
