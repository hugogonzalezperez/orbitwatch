import { describe, expect, it } from 'vitest'
import { epochDate } from '../../src/satellites/data/omm'
import { createSwarm } from '../../src/satellites/propagation/swarm'
import { stationRecords } from '../helpers/fixtures'

const records = stationRecords()
const t = new Date(epochDate(records[0]!).getTime() + 3_600_000)
const RED = [1, 0, 0] as const
const BLUE = [0, 0, 1] as const

describe('createSwarm', () => {
  it('calcula la posición de todos los objetos de todos los grupos, cada uno con el color de su grupo', () => {
    const swarm = createSwarm([
      { records: records.slice(0, 5), rgb: RED },
      { records: records.slice(5, 20), rgb: BLUE },
    ])
    const { count, positions, colors } = swarm.update(t)
    expect(count).toBe(20)
    expect([...colors.slice(0, 3)]).toEqual(RED)
    expect([...colors.slice(14 * 3, 15 * 3)]).toEqual(BLUE)
    for (let i = 0; i < count; i++) {
      const radius = Math.hypot(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!)
      expect(radius).toBeGreaterThan(1) // por encima de la superficie, en radios terrestres
      expect(radius).toBeLessThan(2) // y en órbita baja
    }
  })

  it('omite los que SGP4 no puede calcular sin descolocar los colores de los demás', () => {
    const swarm = createSwarm([
      { records: [records[0]!], rgb: RED },
      { records: [{ ...records[1]!, ECCENTRICITY: 0.99999 }], rgb: BLUE }, // órbita que cae a la Tierra
      { records: [records[2]!], rgb: BLUE },
    ])
    const { count, colors } = swarm.update(new Date(t.getTime() + 86_400_000))
    expect(count).toBe(2)
    expect([...colors.slice(0, 3)]).toEqual(RED)
    expect([...colors.slice(3, 6)]).toEqual(BLUE)
  })

  it('reutiliza los mismos buffers entre llamadas', () => {
    const swarm = createSwarm([{ records, rgb: RED }])
    expect(swarm.update(t).positions).toBe(swarm.update(new Date(t.getTime() + 60_000)).positions)
  })

  it('sin objetos devuelve cero', () => {
    expect(createSwarm([]).update(t).count).toBe(0)
  })
})
