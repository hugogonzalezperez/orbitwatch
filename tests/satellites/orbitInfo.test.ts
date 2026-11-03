import { describe, expect, it } from 'vitest'
import { ALTITUDE_MARKS, altitudeRulerPosition, describeOrbit, regimeOf } from '../../src/satellites/orbitInfo'
import { issRecord } from '../helpers/fixtures'

const iss = issRecord()
const record = (patch: Partial<typeof iss>) => ({ ...iss, ...patch })

describe('describeOrbit', () => {
  it('la ISS: unos 93 minutos por vuelta, perigeo y apogeo a unos 400 km, órbita baja', () => {
    const orbit = describeOrbit(iss)
    expect(orbit.periodMinutes).toBeGreaterThan(92)
    expect(orbit.periodMinutes).toBeLessThan(94)
    expect(orbit.perigeeKm).toBeGreaterThan(380)
    expect(orbit.apogeeKm).toBeLessThan(450)
    expect(orbit.apogeeKm).toBeGreaterThanOrEqual(orbit.perigeeKm)
    expect(orbit.regime).toBe('low')
    expect(orbit.inclinationDeg).toBeCloseTo(51.6, 0)
  })

  it('un satélite geoestacionario (1,0027 vueltas por día) es geosíncrono, a unos 35 786 km', () => {
    const orbit = describeOrbit(record({ MEAN_MOTION: 1.0027, ECCENTRICITY: 0.0002, INCLINATION: 0.05 }))
    expect(orbit.regime).toBe('geosynchronous')
    expect(orbit.perigeeKm).toBeGreaterThan(35_700)
    expect(orbit.perigeeKm).toBeLessThan(35_900)
  })

  it('un GPS (2 vueltas por día, casi circular) es órbita media, a unos 20 200 km', () => {
    const orbit = describeOrbit(record({ MEAN_MOTION: 2.0056, ECCENTRICITY: 0.001 }))
    expect(orbit.regime).toBe('medium')
    expect(orbit.apogeeKm).toBeGreaterThan(20_000)
    expect(orbit.apogeeKm).toBeLessThan(20_500)
  })

  it('una Molniya (excentricidad 0,74) es elíptica aunque su perigeo sea bajo', () => {
    expect(describeOrbit(record({ MEAN_MOTION: 2.0058, ECCENTRICITY: 0.74, INCLINATION: 63.4 })).regime).toBe('elliptical')
  })

  it('por encima de la geoestacionaria es órbita alta', () => {
    expect(describeOrbit(record({ MEAN_MOTION: 0.5, ECCENTRICITY: 0.001 })).regime).toBe('high')
  })

  it('en el límite de órbita baja (2 000 km de altura media) pasa a media', () => {
    const justBelow = describeOrbit(record({ MEAN_MOTION: 11.9, ECCENTRICITY: 0.0001 })) // ~1 700 km
    const justAbove = describeOrbit(record({ MEAN_MOTION: 11.1, ECCENTRICITY: 0.0001 })) // ~2 100 km
    expect(justBelow.regime).toBe('low')
    expect(justAbove.regime).toBe('medium')
  })
})

describe('altitudeRulerPosition', () => {
  it('va de 0 en la superficie a 1 a partir de 40 000 km, sin salirse', () => {
    expect(altitudeRulerPosition(0)).toBe(0)
    expect(altitudeRulerPosition(40_000)).toBe(1)
    expect(altitudeRulerPosition(90_000)).toBe(1)
    expect(altitudeRulerPosition(-50)).toBe(0)
  })

  it('crece con la altitud y deja la órbita baja visible (400 km no se pega a la superficie)', () => {
    expect(altitudeRulerPosition(400)).toBeGreaterThan(0.08)
    expect(altitudeRulerPosition(20_200)).toBeGreaterThan(altitudeRulerPosition(400))
    expect(altitudeRulerPosition(35_786)).toBeGreaterThan(altitudeRulerPosition(20_200))
  })

  it('las marcas de la regla están en orden y cada una tiene nombre', () => {
    const positions = ALTITUDE_MARKS.map((m) => altitudeRulerPosition(m.km))
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    expect(ALTITUDE_MARKS.every((m) => m.label.length > 0)).toBe(true)
  })
})

describe('regimeOf', () => {
  it('da el mismo régimen que describeOrbit sin necesitar un registro', () => {
    for (const patch of [{}, { MEAN_MOTION: 1.0027, ECCENTRICITY: 0.0002 }, { MEAN_MOTION: 2.0056, ECCENTRICITY: 0.001 }, { MEAN_MOTION: 2.0, ECCENTRICITY: 0.7 }, { MEAN_MOTION: 0.5, ECCENTRICITY: 0.01 }]) {
      const r = record(patch)
      expect(regimeOf(Number(r.MEAN_MOTION), Number(r.ECCENTRICITY))).toBe(describeOrbit(r).regime)
    }
  })
})
