import { describe, expect, it } from 'vitest'
import { EARTH_RADIUS_KM } from '../../src/shared/units'
import { epochDate } from '../../src/satellites/data/omm'
import { createBatch, createSample, propagateBatch } from '../../src/satellites/propagation/batch'
import { createTracked, sceneAt } from '../../src/satellites/propagation/position'
import { issRecord, stationRecords } from '../helpers/fixtures'

const records = stationRecords()
const t = epochDate(records[0]!).getTime() + 3_600_000
const run = (list = records, epochMs = t) => {
  const batch = createBatch(list)
  const sample = createSample(list.length)
  propagateBatch(batch, epochMs, sample)
  return sample
}

describe('propagateBatch', () => {
  it('da la misma posición que calcular cada satélite por separado, en unidades de escena', () => {
    const sample = run()
    records.forEach((record, i) => {
      const expected = sceneAt(createTracked(record), new Date(t))!
      for (let k = 0; k < 3; k++) expect(sample.positions[i * 3 + k]!).toBeCloseTo(expected[k]!, 5) // float32
    })
    expect(sample.epochMs).toBe(t)
  })

  it('la velocidad es la derivada de la posición (unidades de escena por segundo)', () => {
    const iss = [issRecord()]
    const before = run(iss, t - 1000).positions
    const after = run(iss, t + 1000).positions
    const { velocities } = run(iss)
    for (let k = 0; k < 3; k++) expect(velocities[k]!).toBeCloseTo((after[k]! - before[k]!) / 2, 6)
    const speedKmS = Math.hypot(velocities[0]!, velocities[1]!, velocities[2]!) * EARTH_RADIUS_KM
    expect(speedKmS).toBeGreaterThan(7.6)
    expect(speedKmS).toBeLessThan(7.7)
  })

  it('un satélite que SGP4 no puede calcular queda marcado como inválido y sin posición, sin tocar a los demás', () => {
    const broken = { ...records[1]!, ECCENTRICITY: 0.99999 }
    const sample = run([records[0]!, broken, records[2]!])
    expect([...sample.valid]).toEqual([1, 0, 1])
    expect([...sample.positions.slice(3, 6)]).toEqual([0, 0, 0])
    expect(Math.hypot(...sample.positions.slice(0, 3))).toBeGreaterThan(1)
  })

  it('reutiliza el mismo resultado: una llamada nueva sobrescribe la anterior', () => {
    const batch = createBatch(records)
    const sample = createSample(records.length)
    propagateBatch(batch, t, sample)
    const first = Float32Array.from(sample.positions)
    propagateBatch(batch, t + 600_000, sample)
    expect(sample.positions).not.toEqual(first)
    expect(sample.epochMs).toBe(t + 600_000)
  })
})

describe('extrapolar con la velocidad entre dos muestras', () => {
  // Es lo que hace el vertex shader: posición + velocidad × tiempo. El error es la curvatura de la órbita.
  const errorKm = (seconds: number) => {
    const batch = createBatch([issRecord()])
    const sample = createSample(1)
    propagateBatch(batch, t, sample)
    const exact = createSample(1)
    propagateBatch(batch, t + seconds * 1000, exact)
    let squared = 0
    for (let k = 0; k < 3; k++) squared += (sample.positions[k]! + sample.velocities[k]! * seconds - exact.positions[k]!) ** 2
    return Math.sqrt(squared) * EARTH_RADIUS_KM
  }

  it('a 10 s de la muestra (lo que se usa) el error es de menos de 0,5 km, en la ISS (órbita baja, la más curvada)', () => {
    expect(errorKm(10)).toBeLessThan(0.5)
  })

  it('crece con el cuadrado del tiempo: a 60 s, el máximo que se permite, son unos 16 km', () => {
    expect(errorKm(60)).toBeGreaterThan(10)
    expect(errorKm(60)).toBeLessThan(20)
  })

  it('hacia atrás en el tiempo el error es el mismo', () => {
    expect(errorKm(-10)).toBeCloseTo(errorKm(10), 1)
  })
})
