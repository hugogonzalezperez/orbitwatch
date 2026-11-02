import { Group, Vector3, type WebGLRenderer } from 'three'
import { createStore, type Store } from '../shared/store'
import { Color } from 'three'
import { ORBIT_POINTS, SATELLITE_COLOR, SATELLITE_SIZE_PX, SELECTION_COLOR, SWARM_COLORS, SWARM_FALLBACK_COLOR, SWARM_SIZE_PX } from './config'
import { findIss } from './data/groups'
import { parseManifest } from './data/manifest'
import { epochDate, parseOmmList, type OmmRecord } from './data/omm'
import { currentRevolution, orbitProgress, sampleOrbit, type Revolution } from './propagation/orbit'
import { createTracked, stateAt, type SatelliteState, type Tracked } from './propagation/position'
import { createSwarm, type Swarm } from './propagation/swarm'
import { createOrbitLine } from './render/orbitLine'
import { createSatellitePoints } from './render/satellitePoints'
import { createSwarmPoints } from './render/swarmPoints'

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
  /** `swarm: false` omite el enjambre (miles de órbitas) y deja sus posiciones como estaban. */
  update(date: Date, options?: { swarm?: boolean }): void
  dispose(): void
}

const PUBLISH_INTERVAL_MS = 250 // React no necesita más de 4 actualizaciones por segundo

const fetchJson = async (path: string): Promise<unknown> => {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

const ISS_GROUP = 'stations'

/** Descarga los ficheros que lista el manifiesto (`npm run data`) y los valida. */
async function loadGroups(): Promise<{ generatedAt: Date; groups: Array<{ name: string; records: OmmRecord[] }> }> {
  const { generatedAt, sources } = parseManifest(await fetchJson('data/manifest.json'))
  const groups = await Promise.all(
    sources.map(async ({ group, file }) => ({ name: group, records: parseOmmList(await fetchJson(`data/${file}`)).records })),
  )
  return { generatedAt, groups }
}

const toRgb = (hex: number): [number, number, number] => {
  const { r, g, b } = new Color(hex)
  return [r, g, b]
}

export function createSatellites(renderer: WebGLRenderer, { onChange }: { onChange: () => void }): Satellites {
  const points = createSatellitePoints(renderer, 1, {
    color: SATELLITE_COLOR,
    ringColor: SELECTION_COLOR,
    sizePx: SATELLITE_SIZE_PX,
  })
  const orbitLine = createOrbitLine(SATELLITE_COLOR)
  let swarm: Swarm | undefined
  let swarmPoints: ReturnType<typeof createSwarmPoints> | undefined
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

  loadGroups()
    .then(({ generatedAt, groups }) => {
      if (disposed) return
      tracked = createTracked(findIss(groups.find((g) => g.name === ISS_GROUP)?.records ?? []))
      downloadedAt = generatedAt
      const others = groups.filter((g) => g.name !== ISS_GROUP)
      swarm = createSwarm(others.map((g) => ({ records: g.records, rgb: toRgb(SWARM_COLORS[g.name] ?? SWARM_FALLBACK_COLOR) })))
      swarmPoints = createSwarmPoints(renderer, others.reduce((n, g) => n + g.records.length, 0), SWARM_SIZE_PX)
      object.add(swarmPoints.object)
      issStatus.set(readyStatus(tracked))
      onChange()
    })
    .catch((error: unknown) => {
      if (disposed) return
      console.error('No se pudieron cargar los datos de los satélites', error)
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
    update(date, { swarm: updateSwarm = true } = {}) {
      if (!tracked) return
      state = stateAt(tracked, date)
      if (state) {
        points.setPositions(state.scene, 1)
        points.setSunlight(state.sunlight)
      } else points.setPositions([], 0)
      if (updateSwarm && swarm && swarmPoints) {
        const frame = swarm.update(date)
        swarmPoints.setFrame(frame.positions, frame.colors, frame.count)
      }
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
