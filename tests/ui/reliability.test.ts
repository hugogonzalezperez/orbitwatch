import { describe, expect, it } from 'vitest'
import { describeReliability } from '../../src/ui/reliability'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const now = new Date('2026-11-02T12:00:00Z')
const at = (msAgo: number) => new Date(now.getTime() - msAgo)

describe('describeReliability', () => {
  it('con elementos de hoy y una descarga reciente, es fiable', () => {
    const r = describeReliability({ epoch: at(3 * HOUR), downloadedAt: at(HOUR), simTime: now, now })
    expect(r.band).toBe('ok')
    expect(r.summary).toBe('Fiable: elementos de hace 3 h')
  })

  it('con la hora simulada a más de 3 días de la época, avisa de que la precisión baja', () => {
    const r = describeReliability({ epoch: at(0), downloadedAt: at(HOUR), simTime: new Date(now.getTime() + 4 * DAY), now })
    expect(r.band).toBe('aging')
    expect(r.summary).toMatch(/precisión/i)
  })

  it('con la hora simulada a 7 días o más de la época, es poco fiable', () => {
    const r = describeReliability({ epoch: at(0), downloadedAt: at(HOUR), simTime: new Date(now.getTime() - 8 * DAY), now })
    expect(r.band).toBe('stale')
    expect(r.summary).toMatch(/poco fiable/i)
  })

  it('con la descarga de hace más de 6 h, avisa de que los datos pueden estar desactualizados', () => {
    const r = describeReliability({ epoch: at(2 * HOUR), downloadedAt: at(7 * HOUR), simTime: now, now })
    expect(r.band).toBe('stale')
    expect(r.summary).toMatch(/desactualizados/i)
  })

  it('manda el peor de los dos avisos', () => {
    const r = describeReliability({ epoch: at(0), downloadedAt: at(4 * HOUR), simTime: new Date(now.getTime() - 8 * DAY), now })
    expect(r.band).toBe('stale')
    expect(r.summary).toMatch(/poco fiable/i)
  })

  it('da el detalle de las dos edades', () => {
    const r = describeReliability({ epoch: at(3 * HOUR), downloadedAt: at(HOUR), simTime: now, now })
    expect(r.epochAge).toBe('hace 3 h')
    expect(r.downloadAge).toBe('hace 1 h')
  })
})
