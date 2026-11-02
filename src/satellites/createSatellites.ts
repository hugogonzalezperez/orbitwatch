import { Color, Group, Vector3, type PerspectiveCamera, type WebGLRenderer } from 'three'
import { pickNearest } from '../scene/picking'
import { createStore, type Store } from '../shared/store'
import { EARTH_RADIUS_KM } from '../shared/units'
import { buildCatalog, type CatalogEntry } from './catalog'
import { describeOrbit, type OrbitDescription } from './orbitInfo'
import { getCategory } from './categories'
import { ORBIT_POINTS, SATELLITE_COLOR, SATELLITE_SIZE_PX, SELECTION_COLOR, SWARM_HIT_RADIUS_PX, SWARM_SIZE_PX } from './config'
import { parseManifest } from './data/manifest'
import { parseOmmList, epochDate, type OmmRecord } from './data/omm'
import { currentRevolution, orbitProgress, sampleOrbit, type Revolution } from './propagation/orbit'
import { createTracked, stateAt, type SatelliteState, type Tracked } from './propagation/position'
import { createSwarm, type Swarm, type SwarmFrame } from './propagation/swarm'
import { createOrbitLine } from './render/orbitLine'
import { createSatellitePoints } from './render/satellitePoints'
import { createSwarmPoints } from './render/swarmPoints'

/** Número de catálogo NORAD. */
export type SatelliteId = number

export const ISS_ID: SatelliteId = 25544

export type DataStatus =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'ready'
      /** Todos los satélites, ordenados por categoría y nombre. */
      catalog: CatalogEntry[]
      /** Cuándo se descargaron de CelesTrak. */
      downloadedAt: Date
    }

export interface SelectedInfo {
  id: SatelliteId
  name: string
  designator: string
  category: string
  /** Periodo, altitudes y tipo de órbita, de los elementos orbitales. */
  shape: OrbitDescription
  /** Época de los elementos orbitales. */
  epoch: Date
  downloadedAt: Date
  /** `null` si SGP4 no puede calcular la posición a esa hora. */
  state: SatelliteState | null
  /** Vuelta actual; `null` solo si SGP4 no puede calcular el satélite a esa hora. */
  orbit: Revolution | null
}

interface Satellites {
  object: Group
  data: Store<DataStatus>
  /** El satélite seleccionado con su posición actual, o `null` si no hay ninguno. */
  selected: Store<SelectedInfo | null>
  select(id: SatelliteId | null): void
  /** Atenúa en el globo los que no están en `ids`; `null` los muestra todos. */
  setHighlight(ids: ReadonlySet<number> | null): void
  /** El satélite visible más cercano al puntero (píxeles CSS dentro del lienzo), o `null`. */
  pick(camera: PerspectiveCamera, width: number, height: number, x: number, y: number): SatelliteId | null
  /** Nombre de un satélite del catálogo, o `null` si no existe. */
  nameOf(id: SatelliteId): string | null
  /** Los grupos de `ids` (categorías) no se dibujan en el globo. */
  setHiddenCategories(ids: ReadonlySet<string>): void
  /** Radio de la órbita del seleccionado en su punto más alto, en radios terrestres desde el centro, o `null`. */
  selectedOrbitRadius(): number | null
  /** Posición del seleccionado en la escena (radios terrestres), o `null`. */
  selectedPosition(): Vector3 | null
  /** Dirección unitaria perpendicular al plano de la órbita del seleccionado (posición × velocidad), o `null`. */
  selectedOrbitNormal(): Vector3 | null
  /** `swarm: false` omite el enjambre (miles de órbitas) y deja sus posiciones como estaban. */
  update(date: Date, options?: { swarm?: boolean }): void
  dispose(): void
}

const EARTH_EQUATORIAL_KM = 6378.137 // las altitudes de los elementos orbitales se cuentan desde el ecuador
const PUBLISH_INTERVAL_MS = 250 // React no necesita más de 4 actualizaciones por segundo

const fetchJson = async (path: string): Promise<unknown> => {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

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
  const marker = createSatellitePoints(renderer, 1, { color: SATELLITE_COLOR, ringColor: SELECTION_COLOR, sizePx: SATELLITE_SIZE_PX })
  const orbitLine = createOrbitLine(SATELLITE_COLOR)
  const object = new Group().add(marker.object, orbitLine.object)
  const data = createStore<DataStatus>({ kind: 'loading' })
  const selected = createStore<SelectedInfo | null>(null)

  let swarm: Swarm | undefined
  let swarmPoints: ReturnType<typeof createSwarmPoints> | undefined
  let frame: SwarmFrame | undefined
  let catalog: CatalogEntry[] = []
  const records = new Map<SatelliteId, OmmRecord>()
  const names = new Map<SatelliteId, string>()
  let downloadedAt = new Date(0)

  let selectedId: SatelliteId | null = null
  let tracked: Tracked | undefined
  let state: SatelliteState | null = null
  let orbit: Revolution | undefined
  let lastPublish = -Infinity
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  const info = (current: Tracked): SelectedInfo => {
    const entry = catalog.find((e) => e.id === selectedId)
    return {
      id: current.record.NORAD_CAT_ID,
      name: entry?.name ?? current.record.OBJECT_NAME,
      designator: current.record.OBJECT_ID,
      category: entry?.category ?? '',
      shape: describeOrbit(current.record),
      epoch: epochDate(current.record),
      downloadedAt,
      state,
      orbit: orbit ?? null,
    }
  }

  const publish = () => {
    timer = undefined
    lastPublish = performance.now()
    if (tracked) selected.set(info(tracked))
  }

  loadGroups()
    .then(({ generatedAt, groups }) => {
      if (disposed) return
      downloadedAt = generatedAt
      catalog = buildCatalog(groups)
      for (const entry of catalog) names.set(entry.id, entry.name)
      for (const { records: list } of groups) for (const record of list) if (!records.has(record.NORAD_CAT_ID)) records.set(record.NORAD_CAT_ID, record)
      swarm = createSwarm(
        groups.map((g) => {
          const { color, opacity } = getCategory(g.name)
          return { id: g.name, records: g.records, rgb: toRgb(color), opacity }
        }),
      )
      swarmPoints = createSwarmPoints(renderer, records.size, SWARM_SIZE_PX)
      object.add(swarmPoints.object)
      data.set({ kind: 'ready', catalog, downloadedAt })
      onChange()
    })
    .catch((error: unknown) => {
      if (disposed) return
      console.error('No se pudieron cargar los datos de los satélites', error)
      data.set({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
    })

  /** Recalcula la vuelta solo si `date` se sale de la que hay; sin seleccionar, no gasta nada. */
  const updateOrbit = (current: Tracked, date: Date) => {
    if (!orbit || date < orbit.start || date >= orbit.end) {
      orbit = currentRevolution(current, date) ?? undefined
      if (orbit) orbitLine.setPoints(sampleOrbit(current, orbit, ORBIT_POINTS))
    }
    orbitLine.object.visible = orbit !== undefined
    if (orbit) orbitLine.setProgress(orbitProgress(orbit, date).fraction)
  }

  return {
    object,
    data,
    selected,
    select(id) {
      const record = id === null ? undefined : records.get(id)
      selectedId = record ? id : null
      tracked = record && createTracked(record)
      state = null
      orbit = undefined
      marker.setSelected(tracked !== undefined)
      if (tracked) {
        publish()
      } else {
        marker.setPositions([], 0)
        orbitLine.object.visible = false
        selected.set(null)
      }
    },
    setHighlight: (ids) => swarm?.setHighlight(ids),
    nameOf: (id) => names.get(id) ?? null,
    setHiddenCategories: (ids) => swarm?.setHidden(ids),
    selectedOrbitRadius: () => (tracked ? (describeOrbit(tracked.record).apogeeKm + EARTH_EQUATORIAL_KM) / EARTH_RADIUS_KM : null),
    pick(camera, width, height, x, y) {
      if (!frame) return null
      const index = pickNearest(frame.positions, frame.count, camera, width, height, x, y, SWARM_HIT_RADIUS_PX)
      return index === -1 ? null : frame.ids[index]!
    },
    selectedPosition: () => (state ? new Vector3(...state.scene) : null),
    selectedOrbitNormal: () =>
      state ? new Vector3(...state.scene).cross(new Vector3(...state.velocity)).normalize() : null,
    update(date, { swarm: updateSwarm = true } = {}) {
      if (updateSwarm && swarm && swarmPoints) {
        frame = swarm.update(date)
        swarmPoints.setFrame(frame.positions, frame.colors, frame.count)
      }
      if (!tracked) return
      state = stateAt(tracked, date)
      if (state) {
        marker.setPositions(state.scene, 1)
        marker.setSunlight(state.sunlight)
      } else marker.setPositions([], 0)
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
