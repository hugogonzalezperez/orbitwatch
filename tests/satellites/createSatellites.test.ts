import { PerspectiveCamera, type WebGLRenderer } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSatellites, ISS_ID } from '../../src/satellites/createSatellites'
import { epochDate } from '../../src/satellites/data/omm'
import { issRecord, stationRecords, stationsRaw } from '../helpers/fixtures'

const renderer = { getPixelRatio: () => 1 } as unknown as WebGLRenderer
const raw = stationsRaw as unknown[]
const FILES: Record<string, unknown> = {
  'manifest.json': {
    schemaVersion: 2,
    generatedAt: '2026-11-02T00:00:00Z',
    sources: [
      { group: 'stations', file: 'stations.json', count: 10 },
      { group: 'weather', file: 'weather.json', count: 10 },
    ],
  },
  'stations.json': raw.slice(0, 10),
  'weather.json': raw.slice(10),
}
const serve = (files: Record<string, unknown>) =>
  vi.stubGlobal('fetch', async (url: string) => {
    const name = String(url).split('/').pop()!
    return name in files ? new Response(JSON.stringify(files[name])) : new Response('', { status: 404 })
  })

const open = async (onChange = () => {}) => {
  serve(FILES)
  const satellites = createSatellites(renderer, { onChange })
  await vi.waitFor(() => expect(satellites.data.get().kind).not.toBe('loading'))
  return satellites
}
const oneHourAfterEpoch = new Date(epochDate(issRecord()).getTime() + 3_600_000)

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('createSatellites: carga', () => {
  it('lee los grupos del manifiesto, ordena el catálogo por categoría y avisa una vez', async () => {
    const onChange = vi.fn()
    const satellites = await open(onChange)
    const data = satellites.data.get()
    if (data.kind !== 'ready') throw new Error('debería estar cargado')
    expect(data.catalog).toHaveLength(20)
    expect(data.catalog.slice(0, 10).every((e) => e.category === 'stations')).toBe(true)
    expect(data.catalog.slice(10).every((e) => e.category === 'weather')).toBe(true)
    expect(data.downloadedAt.toISOString()).toBe('2026-11-02T00:00:00.000Z')
    expect(onChange).toHaveBeenCalledTimes(1)
    satellites.dispose()
  })

  it('si falta un fichero, queda en error con el motivo y no avisa', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const missing = { ...FILES }
    delete missing['weather.json']
    serve(missing)
    const onChange = vi.fn()
    const satellites = createSatellites(renderer, { onChange })
    await vi.waitFor(() => expect(satellites.data.get().kind).toBe('error'))
    expect(satellites.data.get()).toMatchObject({ kind: 'error', message: 'HTTP 404' })
    expect(onChange).not.toHaveBeenCalled()
    satellites.dispose()
  })

  it('nameOf da el nombre de un satélite del catálogo y null si no existe', async () => {
    const satellites = await open()
    expect(satellites.nameOf(ISS_ID)).toBe('ISS (ZARYA)')
    expect(satellites.nameOf(1)).toBeNull()
    satellites.dispose()
  })
})

describe('createSatellites: selección', () => {
  it('al elegir la ISS publica su ficha con categoría y tipo de órbita, aún sin posición', async () => {
    const satellites = await open()
    satellites.select(ISS_ID)
    const info = satellites.selected.get()!
    expect(info).toMatchObject({ id: ISS_ID, name: 'ISS (ZARYA)', category: 'stations', state: null, orbit: null })
    expect(info.shape.regime).toBe('low')
    satellites.dispose()
  })

  it('con la hora calcula su posición, a la altura de la ISS, y el radio de su órbita', async () => {
    const satellites = await open()
    satellites.select(ISS_ID)
    expect(satellites.selectedPosition()).toBeNull()
    satellites.update(oneHourAfterEpoch)
    const radius = satellites.selectedPosition()!.length()
    expect(radius).toBeGreaterThan(1.06) // 380 a 450 km sobre una Tierra de 6 371 km
    expect(radius).toBeLessThan(1.08)
    expect(satellites.selectedOrbitRadius()!).toBeGreaterThan(1.06)
    expect(satellites.selectedOrbitRadius()!).toBeLessThan(1.08)
    expect(satellites.selectedOrbitNormal()!.length()).toBeCloseTo(1, 6)
    satellites.dispose()
  })

  it('elegir un satélite de otro grupo lo marca con la categoría de su grupo', async () => {
    const satellites = await open()
    satellites.select(stationRecords()[15]!.NORAD_CAT_ID)
    expect(satellites.selected.get()!.category).toBe('weather')
    satellites.dispose()
  })

  it('elegir null o un número que no existe deja todo sin seleccionar', async () => {
    const satellites = await open()
    satellites.select(ISS_ID)
    satellites.update(oneHourAfterEpoch)
    satellites.select(null)
    expect(satellites.selected.get()).toBeNull()
    expect(satellites.selectedPosition()).toBeNull()
    expect(satellites.selectedOrbitRadius()).toBeNull()
    satellites.select(123)
    expect(satellites.selected.get()).toBeNull()
    satellites.dispose()
  })

  it('antes de cargar, elegir no hace nada', () => {
    serve(FILES)
    const satellites = createSatellites(renderer, { onChange: () => {} })
    satellites.select(ISS_ID)
    expect(satellites.selected.get()).toBeNull()
    satellites.dispose()
  })
})

describe('createSatellites: elegir bajo el puntero', () => {
  /** Con la muestra calculada y la cámara fuera de la Tierra mirando a la ISS, que queda en el centro de la imagen. */
  const lookingAtIss = async () => {
    let arrived: () => void = () => {}
    const sample = new Promise<void>((resolve) => (arrived = resolve))
    serve(FILES)
    const satellites = createSatellites(renderer, { onChange: () => {}, onSwarm: () => arrived() })
    await vi.waitFor(() => expect(satellites.data.get().kind).toBe('ready'))
    satellites.update(oneHourAfterEpoch)
    await sample
    satellites.select(ISS_ID)
    satellites.update(oneHourAfterEpoch)
    const camera = new PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.copy(satellites.selectedPosition()!.multiplyScalar(4))
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    return { satellites, camera }
  }

  it('el satélite en el centro de la imagen es el que se elige, con su número de catálogo', async () => {
    const { satellites, camera } = await lookingAtIss()
    expect(satellites.pick(camera, 800, 800, 400, 400)).toBe(ISS_ID)
    expect(satellites.pick(camera, 800, 800, 10, 10)).toBeNull()
    satellites.dispose()
  })

  it('las categorías ocultas no se pueden elegir (aquí hay otras naves en la misma órbita), y al mostrarlas vuelven', async () => {
    const { satellites, camera } = await lookingAtIss()
    satellites.setHiddenCategories(new Set(['stations']))
    expect(satellites.pick(camera, 800, 800, 400, 400)).not.toBe(ISS_ID) // lo que queda de la otra categoría, que va con la ISS
    satellites.setHiddenCategories(new Set(['stations', 'weather']))
    expect(satellites.pick(camera, 800, 800, 400, 400)).toBeNull()
    satellites.setHiddenCategories(new Set())
    expect(satellites.pick(camera, 800, 800, 400, 400)).toBe(ISS_ID)
    satellites.dispose()
  })

  it('el estado del cálculo cuenta los satélites del enjambre y cuántos calculó SGP4', async () => {
    const { satellites } = await lookingAtIss()
    expect(satellites.swarmStats()).toMatchObject({ size: 20, valid: 20 })
    satellites.dispose()
  })
})

