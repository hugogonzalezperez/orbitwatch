import { describe, expect, it } from 'vitest'
import { findIss } from '../../src/satellites/data/groups'
import { stationRecords } from '../helpers/fixtures'

describe('findIss', () => {
  it('encuentra la ISS por su número de catálogo', () => {
    expect(findIss(stationRecords()).NORAD_CAT_ID).toBe(25544)
  })

  it('rechaza una lista sin la ISS, diciendo cuál falta', () => {
    expect(() => findIss(stationRecords().filter((r) => r.NORAD_CAT_ID !== 25544))).toThrow(/25544/)
  })
})
