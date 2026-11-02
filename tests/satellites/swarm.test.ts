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
      { id: 'g', records: records.slice(0, 5), rgb: RED },
      { id: 'g', records: records.slice(5, 20), rgb: BLUE },
    ])
    const { count, positions, colors } = swarm.update(t)
    expect(count).toBe(20)
    expect([...colors.slice(0, 4)]).toEqual([...RED, 1])
    expect([...colors.slice(14 * 4, 15 * 4)]).toEqual([...BLUE, 1])
    for (let i = 0; i < count; i++) {
      const radius = Math.hypot(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!)
      expect(radius).toBeGreaterThan(1) // por encima de la superficie, en radios terrestres
      expect(radius).toBeLessThan(2) // y en órbita baja
    }
  })

  it('omite los que SGP4 no puede calcular sin descolocar los colores de los demás', () => {
    const swarm = createSwarm([
      { id: 'g', records: [records[0]!], rgb: RED },
      { id: 'g', records: [{ ...records[1]!, ECCENTRICITY: 0.99999 }], rgb: BLUE }, // órbita que cae a la Tierra
      { id: 'g', records: [records[2]!], rgb: BLUE },
    ])
    const { count, colors } = swarm.update(new Date(t.getTime() + 86_400_000))
    expect(count).toBe(2)
    expect([...colors.slice(0, 4)]).toEqual([...RED, 1])
    expect([...colors.slice(4, 8)]).toEqual([...BLUE, 1])
  })

  it('reutiliza los mismos buffers entre llamadas', () => {
    const swarm = createSwarm([{ id: 'g', records, rgb: RED }])
    expect(swarm.update(t).positions).toBe(swarm.update(new Date(t.getTime() + 60_000)).positions)
  })

  it('cada posición lleva el número de catálogo de su satélite, también tras omitir alguno', () => {
    const swarm = createSwarm([{ id: 'g', records: [records[0]!, { ...records[1]!, ECCENTRICITY: 0.99999 }, records[2]!], rgb: RED }])
    const { count, ids } = swarm.update(new Date(t.getTime() + 86_400_000))
    expect(count).toBe(2)
    expect([...ids.slice(0, count)]).toEqual([records[0]!.NORAD_CAT_ID, records[2]!.NORAD_CAT_ID])
  })

  it('un objeto en dos grupos solo cuenta una vez, en el primero', () => {
    const swarm = createSwarm([
      { id: 'g', records: [records[0]!], rgb: RED },
      { id: 'g', records: [records[0]!, records[1]!], rgb: BLUE },
    ])
    const { count, colors } = swarm.update(t)
    expect(count).toBe(2)
    expect([...colors.slice(0, 3)]).toEqual(RED)
  })

  it('con un resaltado pequeño, los que coinciden se enfatizan (más de 1) y los demás se atenúan', () => {
    const swarm = createSwarm([{ id: 'g', records: records.slice(0, 3), rgb: RED }])
    swarm.setHighlight(new Set([records[1]!.NORAD_CAT_ID]))
    const { colors, ids } = swarm.update(t)
    const alphaOf = (id: number) => colors[ids.indexOf(id) * 4 + 3]!
    expect(alphaOf(records[1]!.NORAD_CAT_ID)).toBeGreaterThan(1)
    expect(alphaOf(records[0]!.NORAD_CAT_ID)).toBeLessThan(0.3)
    expect(alphaOf(records[0]!.NORAD_CAT_ID)).toBeGreaterThan(0)
  })

  it('con un resaltado enorme no se enfatiza a nadie: agrandar miles de puntos sería ruido', () => {
    const swarm = createSwarm([{ id: 'g', records: records.slice(0, 3), rgb: RED }])
    const many = new Set(Array.from({ length: 600 }, (_, i) => i))
    many.add(records[1]!.NORAD_CAT_ID)
    swarm.setHighlight(many)
    const { colors, ids } = swarm.update(t)
    expect(colors[ids.indexOf(records[1]!.NORAD_CAT_ID) * 4 + 3]).toBe(1)
  })

  it('quitar el resaltado devuelve todos a su opacidad', () => {
    const swarm = createSwarm([{ id: 'g', records: records.slice(0, 3), rgb: RED }])
    swarm.setHighlight(new Set())
    swarm.setHighlight(null)
    const { colors, count } = swarm.update(t)
    for (let i = 0; i < count; i++) expect(colors[i * 4 + 3]).toBe(1)
  })

  it('un grupo oculto no aparece ni se calcula; al mostrarlo vuelve', () => {
    const swarm = createSwarm([
      { id: 'a', records: records.slice(0, 5), rgb: RED },
      { id: 'b', records: records.slice(5, 20), rgb: BLUE },
    ])
    swarm.setHidden(new Set(['b']))
    const hidden = swarm.update(t)
    expect(hidden.count).toBe(5)
    expect([...hidden.ids.slice(0, 5)].sort()).toEqual(records.slice(0, 5).map((r) => r.NORAD_CAT_ID).sort())
    swarm.setHidden(new Set())
    expect(swarm.update(t).count).toBe(20)
  })

  it('la opacidad base del grupo se aplica; atenuar la reduce y enfatizar la sube por encima de 1', () => {
    const swarm = createSwarm([{ id: 'g', records: records.slice(0, 2), rgb: RED, opacity: 0.5 }])
    const alphas = () => {
      const { colors, count } = swarm.update(t)
      return Array.from({ length: count }, (_, i) => colors[i * 4 + 3]!)
    }
    expect(alphas()).toEqual([0.5, 0.5])
    swarm.setHighlight(new Set([records[0]!.NORAD_CAT_ID]))
    const [first, second] = alphas()
    expect(first).toBeGreaterThan(1)
    expect(second).toBeLessThan(0.12)
    swarm.setHighlight(null)
    expect(alphas()).toEqual([0.5, 0.5])
  })

  it('sin objetos devuelve cero', () => {
    expect(createSwarm([]).update(t).count).toBe(0)
  })
})
