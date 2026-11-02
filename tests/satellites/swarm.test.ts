import { describe, expect, it, vi } from 'vitest'
import { epochDate } from '../../src/satellites/data/omm'
import {
  MAX_EXTRAPOLATION_SECONDS,
  REFRESH_SECONDS,
  createSwarm,
  extrapolationSeconds,
  needsRefresh,
} from '../../src/satellites/propagation/swarm'
import type { OrbitInput } from '../../src/satellites/data/columns'
import { createInlineTransport, type PropagationTransport } from '../../src/satellites/propagation/transport'
import { encodeColumns } from '../../src/satellites/data/columns'
import type { OmmRecord } from '../../src/satellites/data/omm'
import { stationRecords } from '../helpers/fixtures'

const records = stationRecords()
const t = epochDate(records[0]!).getTime() + 3_600_000
const RED = [1, 0, 0] as const
const BLUE = [0, 0, 1] as const

interface TestGroup {
  id: string
  records: OmmRecord[]
  rgb: readonly [number, number, number]
  opacity?: number
}
type Options = NonNullable<Parameters<typeof createSwarm>[2]>

/** Un enjambre con una categoría por grupo, en el orden dado. */
const build = (groups: TestGroup[], options: Options = {}) => {
  const columns = encodeColumns(groups.flatMap((g) => g.records.map((record) => ({ record, category: g.id }))))
  const styles = columns.categories.map((id) => {
    const group = groups.find((g) => g.id === id)
    return { id, rgb: group?.rgb ?? ([1, 1, 1] as const), opacity: group?.opacity ?? 1 }
  })
  return createSwarm(columns, styles, options)
}

/** Un enjambre con una muestra ya calculada en `t`. */
const ready = async (groups: TestGroup[], options: Options = {}) => {
  let arrived: () => void = () => {}
  const onSample = new Promise<void>((resolve) => (arrived = resolve))
  const swarm = build(groups, { ...options, onSample: () => { options.onSample?.(); arrived() } })
  swarm.update(t)
  await onSample
  return swarm
}

describe('needsRefresh', () => {
  it('sin muestra hace falta una, salvo que ya haya una petición en vuelo', () => {
    expect(needsRefresh({ simMs: t, epochMs: null, inFlight: false })).toBe(true)
    expect(needsRefresh({ simMs: t, epochMs: null, inFlight: true })).toBe(false)
  })

  it('con muestra, hace falta otra al pasar REFRESH_SECONDS de tiempo simulado, hacia delante o hacia atrás', () => {
    const near = REFRESH_SECONDS * 1000 - 1
    expect(needsRefresh({ simMs: t + near, epochMs: t, inFlight: false })).toBe(false)
    expect(needsRefresh({ simMs: t + near + 1, epochMs: t, inFlight: false })).toBe(true)
    expect(needsRefresh({ simMs: t - near - 1, epochMs: t, inFlight: false })).toBe(true)
  })

  it('nunca pide otra mientras hay una en vuelo', () => {
    expect(needsRefresh({ simMs: t + 3_600_000, epochMs: t, inFlight: true })).toBe(false)
  })
})

describe('extrapolationSeconds', () => {
  it('es el tiempo transcurrido desde la muestra, con signo', () => {
    expect(extrapolationSeconds(t + 4_000, t)).toBe(4)
    expect(extrapolationSeconds(t - 4_000, t)).toBe(-4)
  })

  it('se acota: tras un salto de hora los puntos no salen disparados mientras llega la muestra nueva', () => {
    expect(extrapolationSeconds(t + 86_400_000, t)).toBe(MAX_EXTRAPOLATION_SECONDS)
    expect(extrapolationSeconds(t - 86_400_000, t)).toBe(-MAX_EXTRAPOLATION_SECONDS)
  })
})

describe('createSwarm: huecos', () => {
  it('un hueco por satélite, con su número de catálogo y el color de su grupo', () => {
    const swarm = build([
      { id: 'a', records: records.slice(0, 5), rgb: RED },
      { id: 'b', records: records.slice(5, 20), rgb: BLUE },
    ])
    expect(swarm.size).toBe(20)
    expect([...swarm.ids]).toEqual(records.map((r) => r.NORAD_CAT_ID))
    expect([...swarm.colors.slice(0, 4)]).toEqual([...RED, 1])
    expect([...swarm.colors.slice(14 * 4, 15 * 4)]).toEqual([...BLUE, 1])
    swarm.dispose()
  })

  it('sin objetos, tamaño cero', () => {
    const swarm = build([])
    expect(swarm.size).toBe(0)
    swarm.dispose()
  })
})

describe('createSwarm: muestras', () => {
  it('pide una muestra con la hora simulada y avisa al llegar; todos los satélites del lote son válidos', async () => {
    const onSample = vi.fn()
    const swarm = await ready([{ id: 'a', records, rgb: RED }], { onSample })
    expect(onSample).toHaveBeenCalledTimes(1)
    expect(swarm.sample()!.epochMs).toBe(t)
    expect(swarm.validCount()).toBe(20)
    swarm.dispose()
  })

  it('un satélite que SGP4 no calcula sigue teniendo su hueco, pero inválido', async () => {
    const broken = { ...records[1]!, ECCENTRICITY: 0.99999 }
    const swarm = await ready([{ id: 'a', records: [records[0]!, broken, records[2]!], rgb: RED }])
    expect(swarm.size).toBe(3)
    expect(swarm.validCount()).toBe(2)
    expect([...swarm.sample()!.valid]).toEqual([1, 0, 1])
    swarm.dispose()
  })

  it('mientras hay una petición en vuelo no se lanza otra; al llegar, sí si hace falta', async () => {
    let calls = 0
    let release: (() => void) | null = null
    const createTransport = (list: OrbitInput): PropagationTransport => {
      const inline = createInlineTransport(list)
      return {
        async request(ms) {
          calls++
          await new Promise<void>((resolve) => (release = resolve))
          return inline.request(ms)
        },
        dispose() {},
      }
    }
    const swarm = build([{ id: 'a', records, rgb: RED }], { createTransport, onSample: () => {} })
    swarm.update(t)
    swarm.update(t + 1000)
    swarm.update(t + 2000)
    expect(calls).toBe(1)
    release!()
    await vi.waitFor(() => expect(swarm.sample()).not.toBeNull())
    swarm.update(t + 3000) // dentro de los 10 s de la muestra de t: no hace falta otra
    expect(calls).toBe(1)
    swarm.update(t + (REFRESH_SECONDS + 1) * 1000)
    expect(calls).toBe(2)
    release!()
    swarm.dispose()
  })

  it('un fallo del transporte no rompe el enjambre: se podrá pedir otra muestra después', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    let fail = true
    const createTransport = (list: OrbitInput): PropagationTransport => {
      const inline = createInlineTransport(list)
      return { request: async (ms) => (fail ? Promise.reject(new Error('boom')) : inline.request(ms)), dispose() {} }
    }
    const swarm = build([{ id: 'a', records, rgb: RED }], { createTransport, onSample: () => {} })
    swarm.update(t)
    await vi.waitFor(() => expect(error).toHaveBeenCalledTimes(1))
    expect(swarm.sample()).toBeNull()
    fail = false
    swarm.update(t)
    await vi.waitFor(() => expect(swarm.sample()).not.toBeNull())
    swarm.dispose()
    vi.restoreAllMocks()
  })
})

describe('createSwarm: posiciones en cualquier instante', () => {
  const FAR = 1e6
  it('posición de la muestra más velocidad por el tiempo transcurrido', async () => {
    const swarm = await ready([{ id: 'a', records, rgb: RED }])
    const out = new Float32Array(20 * 3)
    swarm.positionsAt(t + 5000, out)
    const { positions, velocities } = swarm.sample()!
    for (let k = 0; k < 3; k++) expect(out[k]!).toBeCloseTo(positions[k]! + velocities[k]! * 5, 6)
    swarm.dispose()
  })

  it('lo inválido y lo oculto se manda lejos, fuera de cualquier selección', async () => {
    const broken = { ...records[1]!, ECCENTRICITY: 0.99999 }
    const swarm = await ready([
      { id: 'a', records: [records[0]!, broken], rgb: RED },
      { id: 'b', records: [records[2]!], rgb: BLUE },
    ])
    swarm.setHidden(new Set(['b']))
    const out = new Float32Array(3 * 3)
    swarm.positionsAt(t, out)
    expect(Math.hypot(out[0]!, out[1]!, out[2]!)).toBeLessThan(2) // el válido y visible, en su sitio
    expect(out[3]).toBe(FAR) // el inválido
    expect(out[6]).toBe(FAR) // el de la categoría oculta
    swarm.dispose()
  })

  it('antes de la primera muestra, todo está lejos', () => {
    const swarm = build([{ id: 'a', records: records.slice(0, 2), rgb: RED }])
    const out = new Float32Array(6)
    swarm.positionsAt(t, out)
    expect([...out].every((v) => v === FAR)).toBe(true)
    swarm.dispose()
  })
})

describe('createSwarm: color y opacidad por hueco', () => {
  const alphas = (swarm: Awaited<ReturnType<typeof ready>>) => Array.from({ length: swarm.size }, (_, i) => swarm.colors[i * 4 + 3]!)

  it('el grupo oculto pasa a opacidad 0 y vuelve; cada cambio sube la versión de los colores', () => {
    const swarm = build([
      { id: 'a', records: records.slice(0, 2), rgb: RED },
      { id: 'b', records: records.slice(2, 4), rgb: BLUE },
    ])
    const v0 = swarm.colorsVersion()
    swarm.setHidden(new Set(['b']))
    expect(alphas(swarm as never)).toEqual([1, 1, 0, 0])
    expect(swarm.colorsVersion()).toBeGreaterThan(v0)
    swarm.setHidden(new Set())
    expect(alphas(swarm as never)).toEqual([1, 1, 1, 1])
    swarm.dispose()
  })

  it('con un resaltado pequeño, los que coinciden se enfatizan (más de 1) y los demás se atenúan', () => {
    const swarm = build([{ id: 'a', records: records.slice(0, 3), rgb: RED }])
    swarm.setHighlight(new Set([records[1]!.NORAD_CAT_ID]))
    const [first, second, third] = alphas(swarm as never)
    expect(second).toBeGreaterThan(1)
    expect(first).toBeLessThan(0.3)
    expect(first).toBeGreaterThan(0)
    expect(third).toBe(first)
    swarm.dispose()
  })

  it('con un resaltado enorme no se enfatiza a nadie', () => {
    const swarm = build([{ id: 'a', records: records.slice(0, 3), rgb: RED }])
    const many = new Set(Array.from({ length: 600 }, (_, i) => i))
    many.add(records[1]!.NORAD_CAT_ID)
    swarm.setHighlight(many)
    expect(alphas(swarm as never)[1]).toBe(1)
    swarm.dispose()
  })

  it('quitar el resaltado devuelve a todos a su opacidad base, y la opacidad base del grupo se respeta', () => {
    const swarm = build([{ id: 'a', records: records.slice(0, 2), rgb: RED, opacity: 0.5 }])
    expect(alphas(swarm as never)).toEqual([0.5, 0.5])
    swarm.setHighlight(new Set([records[0]!.NORAD_CAT_ID]))
    expect(alphas(swarm as never)[0]).toBeGreaterThan(1)
    swarm.setHighlight(null)
    expect(alphas(swarm as never)).toEqual([0.5, 0.5])
    swarm.dispose()
  })

  it('un grupo oculto no se enfatiza aunque coincida con la búsqueda', () => {
    const swarm = build([{ id: 'a', records: records.slice(0, 2), rgb: RED }])
    swarm.setHidden(new Set(['a']))
    swarm.setHighlight(new Set([records[0]!.NORAD_CAT_ID]))
    expect(alphas(swarm as never)).toEqual([0, 0])
    swarm.dispose()
  })
})
