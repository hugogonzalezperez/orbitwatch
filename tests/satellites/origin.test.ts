import { describe, expect, it } from 'vitest'
import { describeOwner, describeStatus, describeType, OWNER_NAMES } from '../../src/satellites/origin'

// Los 99 propietarios que aparecen en el catálogo del 2026-11-02.
const OWNERS_IN_CATALOG =
  'US PRC CIS UK TBD JPN IT IND SKOR FR GER ESA SPN CA TURK SES ITSO AUS O3B FIN EUTE ROC ARGN GLOB UAE NOR GREC ISRA SAUD POL BRAZ IM ORB POR SING IRAN LUXE BEL INDO AB EGYP NETH SWTZ EUME PAKI THAI RWA ALG MALA BUL DEN AC KAZ MEX ISS ABS HUN BELA VTNM AZER MA CZCH ASRA NIG SWED KWT SVK CHLE VENZ ECU SAFR UKR CHBZ RP SVN LTU MNE RASC STCT BOL FRIT IRAQ TMMC LAOS PERU BGD JOR GRSA ETH ROM SLB ANG BHR NKOR NICO HRV DJI NZ BWA'.split(' ')

describe('describeOwner', () => {
  it('da el nombre en español de los países y organizaciones más comunes', () => {
    expect(describeOwner('US')).toBe('Estados Unidos')
    expect(describeOwner('PRC')).toBe('China')
    expect(describeOwner('CIS')).toBe('Rusia y antigua URSS')
    expect(describeOwner('UK')).toBe('Reino Unido')
    expect(describeOwner('ESA')).toBe('Agencia Espacial Europea')
    expect(describeOwner('ISS')).toBe('Estación Espacial Internacional')
  })

  it('cubre los 99 propietarios del catálogo real: todos tienen entrada en la tabla', () => {
    expect(OWNERS_IN_CATALOG).toHaveLength(99)
    for (const code of OWNERS_IN_CATALOG) expect(OWNER_NAMES, code).toHaveProperty(code)
  })

  it('no repite nombres entre códigos distintos: en una lista no se confundirían', () => {
    const names = Object.values(OWNER_NAMES)
    expect(new Set(names).size).toBe(names.length)
  })

  it('un código que no conoce se muestra tal cual, y uno vacío como desconocido', () => {
    expect(describeOwner('XYZ')).toBe('XYZ')
    expect(describeOwner('')).toBe('Desconocido')
  })
})

describe('describeStatus', () => {
  it.each([
    ['+', 'Operativo'],
    ['P', 'Parcialmente operativo'],
    ['B', 'En reserva'],
    ['S', 'En espera de activación'],
    ['X', 'En misión extendida'],
    ['-', 'No operativo'],
  ])('%s es «%s»', (code, label) => {
    expect(describeStatus(code)).toBe(label)
  })

  it('un resto o un código vacío no tiene estado, y uno desconocido se dice', () => {
    expect(describeStatus('')).toBeNull()
    expect(describeStatus('?')).toBe('Estado desconocido')
    expect(describeStatus('Q')).toBe('Estado desconocido')
  })
})

describe('describeType', () => {
  it('nombra los tipos del SATCAT', () => {
    expect(describeType('PAY')).toBe('Carga útil')
    expect(describeType('R/B')).toBe('Cuerpo de cohete')
    expect(describeType('DEB')).toBe('Resto')
    expect(describeType('UNK')).toBe('Desconocido')
    expect(describeType('XYZ')).toBe('Desconocido')
  })
})
