import { describe, expect, it } from 'vitest'
import { cssColor, describeSunlight, formatInteger, formatLatitude, formatLongitude, formatSpan, formatSpeed } from '../../src/ui/format'

const MIN = 60_000
const H = 60 * MIN
const D = 24 * H

describe('formatSpan', () => {
  it('menos de un minuto', () => {
    expect(formatSpan(30_000)).toBe('menos de 1\u00a0min')
  })
  it('minutos', () => {
    expect(formatSpan(35 * MIN)).toBe('35\u00a0min')
  })
  it('horas y minutos', () => {
    expect(formatSpan(14 * H + 20 * MIN)).toBe('14\u00a0h 20\u00a0min')
    expect(formatSpan(2 * H)).toBe('2\u00a0h')
  })
  it('días y horas', () => {
    expect(formatSpan(2 * D + 3 * H)).toBe('2\u00a0d 3\u00a0h')
    expect(formatSpan(5 * D)).toBe('5\u00a0d')
  })
  it('usa el valor absoluto', () => {
    expect(formatSpan(-35 * MIN)).toBe('35\u00a0min')
  })
})

describe('formatSpeed', () => {
  it('con signo y separador de miles', () => {
    expect(formatSpeed(1)).toBe('×1')
    expect(formatSpeed(-60)).toBe('−×60')
    expect(formatSpeed(86400)).toBe('×86\u00a0400')
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

describe('cssColor', () => {
  it('da el color como #rrggbb con ceros a la izquierda', () => {
    expect(cssColor(0xffc857)).toBe('#ffc857')
    expect(cssColor(0x0b0f14)).toBe('#0b0f14')
    expect(cssColor(0)).toBe('#000000')
  })
})

describe('espacios duros', () => {
  it('los miles se separan con un espacio que no se parte en dos líneas', () => {
    expect(formatInteger(35776)).toBe('35\u00a0776')
  })
})
