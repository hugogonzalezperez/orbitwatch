import { Group, Vector3, type WebGLRenderer } from 'three'
import { createStore, type Store } from '../shared/store'
import { ORBIT_POINTS, SATELLITE_COLOR, SATELLITE_SIZE_PX, SELECTION_COLOR } from './config'
import { parseManifest } from './data/manifest'
import { epochDate, findIss } from './data/stations'
import { currentRevolution, orbitProgress, sampleOrbit, type Revolution } from './propagation/orbit'
import { createTracked, stateAt, type SatelliteState, type Tracked } from './propagation/position'
import { createOrbitLine } from './render/orbitLine'
import { createSatellitePoints } from './render/satellitePoints'

export type SatelliteId = 'iss'

export type IssStatus =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'ready'
      name: string
      noradId: number
      designator: string
      /** Época de los elementos orbitales. */
      epoch: Date
      /** Cuándo se descargaron de CelesTrak; `null` si no hay manifiesto. */
      downloadedAt: Date | null
      /** `null` si SGP4 no puede calcular la posición a esa hora. */
      state: SatelliteState | null
      /** Vuelta actual; solo se calcula con la ISS seleccionada. */
      orbit: Revolution | null
    }

interface Satellites {
  object: Group
  issStatus: Store<IssStatus>
  /** Posición de la ISS en la escena (radios terrestres), o `null` si aún no hay. */
  issPosition(): Vector3 | null
  /** Dirección unitaria perpendicular al plano de la órbita (posición × velocidad), o `null`. */
  issOrbitNormal(): Vector3 | null
  setSelected(selected: boolean): void
  update(date: Date): void
  dispose(): void
}

const PUBLISH_INTERVAL_MS = 250 // React no necesita más de 4 actualizaciones por segundo

const fetchJson = async (path: string): Promise<unknown> => {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

// shortcut: instantánea manual de CelesTrak (scripts/update-stations.sh), sin Action ni validación completa; ver plan B1-B7.
export function createSatellites(renderer: WebGLRenderer, { onChange }: { onChange: () => void }): Satellites {
  const points = createSatellitePoints(renderer, 1, {
    color: SATELLITE_COLOR,
    ringColor: SELECTION_COLOR,
    sizePx: SATELLITE_SIZE_PX,
  })
  const orbitLine = createOrbitLine(SATELLITE_COLOR)
  const object = new Group().add(points.object, orbitLine.object)
  const issStatus = createStore<IssStatus>({ kind: 'loading' })

  let tracked: Tracked | undefined
  let downloadedAt: Date | null = null
  let state: SatelliteState | null = null
  let selected = false
  let orbit: Revolution | undefined
  let lastPublish = -Infinity
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  const readyStatus = (current: Tracked): IssStatus => ({
    kind: 'ready',
    name: current.record.OBJECT_NAME,
    noradId: current.record.NORAD_CAT_ID,
    designator: current.record.OBJECT_ID,
    epoch: epochDate(current.record),
    downloadedAt,
    state,
    orbit: orbit ?? null,
  })

  const publish = () => {
    timer = undefined
    lastPublish = performance.now()
    if (tracked) issStatus.set(readyStatus(tracked))
  }

  Promise.all([
    fetchJson('data/stations.json'),
    fetchJson('data/manifest.json')
      .then((json) => parseManifest(json).generatedAt)
      .catch((error: unknown) => {
        console.warn('No se pudo leer el manifiesto de datos', error)
        return null
      }),
  ])
    .then(([json, generatedAt]) => {
      if (disposed) return
      tracked = createTracked(findIss(json))
      downloadedAt = generatedAt
      issStatus.set(readyStatus(tracked))
      onChange()
    })
    .catch((error: unknown) => {
      if (disposed) return
      console.error('No se pudieron cargar los datos de la ISS', error)
      issStatus.set({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
    })

  /** Recalcula la vuelta solo si `date` se sale de la que hay; sin seleccionar, no gasta nada. */
  const updateOrbit = (current: Tracked, date: Date) => {
    if (!selected) {
      orbitLine.object.visible = false
      return
    }
    if (!orbit || date < orbit.start || date >= orbit.end) {
      orbit = currentRevolution(current, date) ?? undefined
      if (orbit) orbitLine.setPoints(sampleOrbit(current, orbit, ORBIT_POINTS))
    }
    orbitLine.object.visible = orbit !== undefined
    if (orbit) orbitLine.setProgress(orbitProgress(orbit, date).fraction)
  }

  return {
    object,
    issStatus,
    issPosition: () => (state ? new Vector3(...state.scene) : null),
    issOrbitNormal: () =>
      state ? new Vector3(...state.scene).cross(new Vector3(...state.velocity)).normalize() : null,
    setSelected(value) {
      selected = value
      points.setSelected(value)
      if (!value) orbit = undefined
    },
    update(date) {
      if (!tracked) return
      state = stateAt(tracked, date)
      if (state) {
        points.setPositions(state.scene, 1)
        points.setSunlight(state.sunlight)
      } else points.setPositions([], 0)
      updateOrbit(tracked, date)
      const wait = PUBLISH_INTERVAL_MS - (performance.now() - lastPublish)
      if (wait <= 0) publish()
      else timer ??= setTimeout(publish, wait) // la última posición siempre acaba publicándose, aunque el reloj esté en pausa
    },
    dispose() {
      disposed = true
      clearTimeout(timer)
    },
  }
}
