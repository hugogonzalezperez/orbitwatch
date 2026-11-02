import { gstime } from 'satellite.js'
import { describe, expect, it } from 'vitest'
import { SKY_RADIUS, sunDirectionScene } from '../../src/shared/sun'

const DEG = Math.PI / 180

// Referencia independiente: astronomy-engine, ecuador de la fecha y con aberración (ascensión recta y declinación en grados).
const REFERENCE: Array<[string, number, number]> = [
  ['2026-03-20T14:46:00Z', 0.0, 0.0], // equinoccio de marzo
  ['2026-06-21T08:24:00Z', 90.001, 23.439], // solsticio de junio
  ['2026-12-21T20:50:00Z', 269.998, -23.437], // solsticio de diciembre
  ['2026-11-02T12:00:00Z', 217.667, -14.838],
  ['2030-07-04T18:30:00Z', 103.946, 22.815],
]

const raDec = (date: Date) => {
  const [x, y, z] = sunDirectionScene(date)
  // La escena es Y arriba: Y de la escena es la declinación y −Z es el eje Y de TEME.
  return { ra: ((Math.atan2(-z, x) / DEG) + 360) % 360, dec: Math.asin(y) / DEG }
}
const angularErrorDeg = (a: { ra: number; dec: number }, b: { ra: number; dec: number }) => {
  const dot = Math.cos(a.dec * DEG) * Math.cos(b.dec * DEG) * Math.cos((a.ra - b.ra) * DEG) + Math.sin(a.dec * DEG) * Math.sin(b.dec * DEG)
  return Math.acos(Math.min(1, dot)) / DEG
}

describe('sunDirectionScene', () => {
  it('es un vector unitario', () => {
    expect(Math.hypot(...sunDirectionScene(new Date('2026-11-02T12:00:00Z')))).toBeCloseTo(1, 12)
  })

  it.each(REFERENCE)('en %s apunta al Sol con menos de 0,05° de error', (iso, ra, dec) => {
    expect(angularErrorDeg(raDec(new Date(iso)), { ra, dec })).toBeLessThan(0.05)
  })

  it('en el equinoccio de marzo el Sol está sobre el ecuador, en la dirección +X', () => {
    const [x, y] = sunDirectionScene(new Date('2026-03-20T14:46:00Z'))
    expect(x).toBeGreaterThan(0.9999)
    expect(Math.abs(y)).toBeLessThan(0.001)
  })

  it('el punto subsolar a las 12:00 UTC del 2 de nov. de 2026 está en −14,8° de latitud y −4,1° de longitud', () => {
    const date = new Date('2026-11-02T12:00:00Z')
    const [x, y, z] = sunDirectionScene(date)
    let lon = Math.atan2(-z, x) - gstime(date)
    lon = Math.atan2(Math.sin(lon), Math.cos(lon)) / DEG
    expect(Math.asin(y) / DEG).toBeCloseTo(-14.838, 1)
    expect(lon).toBeCloseTo(-4.11, 1)
  })

  it('el cielo queda más allá de la Tierra y de la distancia máxima de la cámara', () => {
    expect(SKY_RADIUS).toBeGreaterThan(20)
  })
})
