import { describe, expect, it } from 'vitest'
import { describeSunlight, formatLatitude, formatLongitude, formatSpan, formatSpeed } from '../../src/ui/format'

const MIN = 60_000
const H = 60 * MIN
const D = 24 * H

describe('formatSpan', () => {
  it('menos de un minuto', () => {
    expect(formatSpan(30_000)).toBe('menos de 1 min')
  })
  it('minutos', () => {
    expect(formatSpan(35 * MIN)).toBe('35 min')
  })
  it('horas y minutos', () => {
    expect(formatSpan(14 * H + 20 * MIN)).toBe('14 h 20 min')
    expect(formatSpan(2 * H)).toBe('2 h')
  })
  it('días y horas', () => {
    expect(formatSpan(2 * D + 3 * H)).toBe('2 d 3 h')
    expect(formatSpan(5 * D)).toBe('5 d')
  })
  it('usa el valor absoluto', () => {
    expect(formatSpan(-35 * MIN)).toBe('35 min')
  })
})

describe('formatSpeed', () => {
  it('con signo y separador de miles', () => {
    expect(formatSpeed(1)).toBe('×1')
    expect(formatSpeed(-60)).toBe('−×60')
    expect(formatSpeed(86400)).toBe('×86 400')
  })
})

describe('formatLatitude / formatLongitude', () => {
  it('norte y sur, con coma decimal', () => {
    expect(formatLatitude(51.634)).toBe('51,6° N')
    expect(formatLatitude(-33.87)).toBe('33,9° S')
  })
  it('este y oeste (O)', () => {
    expect(formatLongitude(120.34)).toBe('120,3° E')
    expect(formatLongitude(-3.7)).toBe('3,7° O')
  })
})

describe('describeSunlight', () => {
  it('a la luz, en penumbra y en la sombra', () => {
    expect(describeSunlight(1)).toBe('A la luz del Sol')
    expect(describeSunlight(0)).toBe('En la sombra de la Tierra')
    expect(describeSunlight(0.37)).toBe('En penumbra (37 % de luz)')
  })
})
