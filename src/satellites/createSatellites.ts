import { Color, Group, Vector3, type PerspectiveCamera, type WebGLRenderer } from 'three'
import { pickNearest } from '../scene/picking'
import { createStore, type Store } from '../shared/store'
import { kmToUnits } from '../shared/units'
import { buildCatalog, type CatalogEntry } from './catalog'
import { describeOrbit, EARTH_EQUATORIAL_KM, regimeOf, type OrbitDescription } from './orbitInfo'
import { REGIMES, type ColorMode } from './regimes'
import { getCategory } from './categories'
import { ORBIT_POINTS, SATELLITE_COLOR, SATELLITE_SIZE_PX, SELECTION_COLOR, SWARM_HIT_RADIUS_PX, SWARM_SIZE_PX } from './config'
import { sha256Hex } from '../shared/hash'
import { parseColumns, recordAt, type CatalogColumns } from './data/columns'
import { parseManifest } from './data/manifest'
import { epochDate } from './data/omm'
import { currentRevolution, orbitProgress, sampleOrbit, type Revolution } from './propagation/orbit'
import { createTracked, stateAt, type SatelliteState, type Tracked } from './propagation/position'
import { sunDirectionScene } from '../shared/sun'
import { createSwarm, extrapolationSeconds, type Swarm } from './propagation/swarm'
import { findApproaches } from './screening'
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

/** Lo que dice el SATCAT de CelesTrak: quién lo tiene, qué es, si funciona y cuándo se lanzó. */
export interface Origin {
  owner: string
  type: string
  status: string
  /** "2019-05-24". */
  launch: string
}

export interface SelectedInfo {
  id: SatelliteId
  name: string
  designator: string
  category: string
  origin: Origin
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

/** Dos objetos próximos en este instante. */
export interface Approach {
  a: { id: SatelliteId; name: string }
  b: { id: SatelliteId; name: string }
  distanceKm: number
}

export interface SwarmStats {
  /** Satélites del enjambre y los que SGP4 pudo calcular. */
  size: number
  valid: number
  /** Segundos de tiempo simulado desde la muestra vigente hasta la hora mostrada. */
  elapsedSeconds: number
  /** Milisegundos que tardó en llegar la última muestra. */
  latencyMs: number
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
  /** Estado del cálculo del enjambre, para el medidor de rendimiento; `null` hasta que hay datos. */
  swarmStats(): SwarmStats | null
  /** Nombre de un satélite del catálogo, o `null` si no existe. */
  nameOf(id: SatelliteId): string | null
  /** Los grupos de `ids` (categorías) no se dibujan en el globo. */
  setHiddenCategories(ids: ReadonlySet<string>): void
  /** Colorea el enjambre por categoría o por tipo de órbita. */
  setColorMode(mode: ColorMode): void
  /** Los pares de objetos visibles a menos de `thresholdKm` ahora (sin contar los del mismo lanzamiento ni los acoplados), del más cercano al más lejano; `null` si aún no hay posiciones calculadas. */
  approaches(thresholdKm: number, limit: number): Approach[] | null
  /** Radio de la órbita del seleccionado en su punto más alto, en radios terrestres desde el centro, o `null`. */
  selectedOrbitRadius(): number | null
  /** Posición del seleccionado en la escena (radios terrestres), o `null`. */
  selectedPosition(): Vector3 | null
  /** Dirección unitaria perpendicular al plano de la órbita del seleccionado (posición × velocidad), o `null`. */
  selectedOrbitNormal(): Vector3 | null
  update(date: Date): void
  dispose(): void
}

const DOCKED_KM = 1 // por debajo, con errores de kilómetros, son objetos juntos (la ISS y sus naves acopladas salen a 0,7 km), no un acercamiento
const PUBLISH_INTERVAL_MS = 250 // React no necesita más de 4 actualizaciones por segundo

const fetchText = async (path: string, init?: RequestInit): Promise<string> => {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`, init)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}

/** Descarga el catálogo que indica el manifiesto (`npm run data`), comprueba que llegó entero y lo lee. */
async function loadCatalog(): Promise<{ generatedAt: Date; columns: CatalogColumns }> {
  // El manifiesto se revalida siempre: nombra un catálogo con hash, y uno cacheado apuntaría a un fichero que ya no existe.
  const { generatedAt, catalog } = parseManifest(JSON.parse(await fetchText('data/manifest.json', { cache: 'no-cache' })))
  const text = await fetchText(`data/${catalog.file}`)
  if (globalThis.crypto?.subtle) {
    if ((await sha256Hex(text)) !== catalog.sha256) throw new Error('el catálogo no coincide con su hash: la descarga llegó incompleta o alterada')
  } else console.warn('Sin Web Crypto (¿página sin https?): no se puede comprobar el hash del catálogo')
  const columns = parseColumns(JSON.parse(text))
  if (columns.id.length !== catalog.count) throw new Error(`el catálogo trae ${columns.id.length} objetos y el manifiesto dice ${catalog.count}`)
  return { generatedAt, columns }
}

const toRgb = (hex: number): [number, number, number] => {
  const { r, g, b } = new Color(hex)
  return [r, g, b]
}

export function createSatellites(
  renderer: WebGLRenderer,
  { onChange, onSwarm }: { onChange: () => void; onSwarm?: () => void },
): Satellites {
  const marker = createSatellitePoints(renderer, 1, { color: SATELLITE_COLOR, ringColor: SELECTION_COLOR, sizePx: SATELLITE_SIZE_PX })
  const orbitLine = createOrbitLine(SATELLITE_COLOR)
  const object = new Group().add(marker.object, orbitLine.object)
  const data = createStore<DataStatus>({ kind: 'loading' })
  const selected = createStore<SelectedInfo | null>(null)

  // Lo que se pide antes de que cargue el enjambre (por ejemplo, filtros que vienen en la dirección) se aplica al crearlo.
  let hiddenIds: ReadonlySet<string> = new Set()
  let highlightIds: ReadonlySet<number> | null = null
  let colorMode: ColorMode = 'category'
  let swarm: Swarm | undefined
  let swarmPoints: ReturnType<typeof createSwarmPoints> | undefined
  let pickPositions = new Float32Array(0)
  let uploadedColors = -1
  let lastTime = 0 // la última hora simulada con la que se actualizó, para elegir bajo el puntero
  let catalog: CatalogEntry[] = []
  let columns: CatalogColumns | undefined
  const rowOf = new Map<SatelliteId, number>() // número de catálogo → fila de las columnas
  const names = new Map<SatelliteId, string>()
  let downloadedAt = new Date(0)

  let tracked: Tracked | undefined
  let state: SatelliteState | null = null
  let orbit: Revolution | undefined
  let lastPublish = -Infinity
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  const info = (current: Tracked): SelectedInfo => {
    const id = current.record.NORAD_CAT_ID
    const row = rowOf.get(id)
    return {
      id,
      name: names.get(id) ?? current.record.OBJECT_NAME,
      designator: current.record.OBJECT_ID,
      category: columns && row !== undefined ? columns.categories[columns.category[row]!]! : '',
      origin:
        columns && row !== undefined
          ? { owner: columns.owner[row]!, type: columns.type[row]!, status: columns.status[row]!, launch: columns.launch[row]! }
          : { owner: '', type: 'UNK', status: '', launch: '' },
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

  loadCatalog()
    .then(({ generatedAt, columns: loaded }) => {
      if (disposed) return
      downloadedAt = generatedAt
      columns = loaded
      catalog = buildCatalog(loaded)
      for (const entry of catalog) names.set(entry.id, entry.name)
      loaded.id.forEach((id, row) => rowOf.set(id, row))
      const styles = loaded.categories.map((id) => {
        const { color, opacity } = getCategory(id)
        return { id, rgb: toRgb(color), opacity }
      })
      const regimeIndex = new Map(REGIMES.map((regime, k) => [regime.id, k]))
      const created = createSwarm(loaded, styles, {
        regimes: Uint8Array.from(loaded.meanMotion, (n, i) => regimeIndex.get(regimeOf(n, loaded.eccentricity[i]!))!),
        regimeRgb: REGIMES.map((regime) => toRgb(regime.color)),
        onSample: () => {
          swarmPoints?.setSample(created.sample()!)
          onSwarm?.()
        },
      })
      created.setHidden(hiddenIds)
      created.setHighlight(highlightIds)
      created.setColorBy(colorMode)
      swarm = created
      swarmPoints = createSwarmPoints(renderer, created.size, SWARM_SIZE_PX)
      pickPositions = new Float32Array(created.size * 3)
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
      const row = id === null ? undefined : rowOf.get(id)
      const record = row === undefined || !columns ? undefined : recordAt(columns, row)
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
    setHighlight(ids) {
      highlightIds = ids
      swarm?.setHighlight(ids)
    },
    swarmStats() {
      const sample = swarm?.sample()
      return swarm && sample
        ? { size: swarm.size, valid: swarm.validCount(), elapsedSeconds: (lastTime - sample.epochMs) / 1000, latencyMs: swarm.latencyMs() }
        : null
    },
    approaches(thresholdKm, limit) {
      if (!swarm?.sample() || !columns) return null
      swarm.positionsAt(lastTime, pickPositions) // lo oculto o inválido va lejos y no cuenta
      const launch = (i: number): string => columns!.designator[i]!.slice(0, 8) // «1998-067» de «1998-067A»: lo del mismo lanzamiento va junto y no es noticia
      const item = (i: number) => ({ id: columns!.id[i]!, name: names.get(columns!.id[i]!) ?? '' })
      return findApproaches(pickPositions, swarm.size, thresholdKm, 1000)
        .filter(({ a, b, distanceKm }) => distanceKm >= DOCKED_KM && launch(a) !== launch(b))
        .slice(0, limit)
        .map(({ a, b, distanceKm }) => ({ a: item(a), b: item(b), distanceKm }))
    },
    nameOf: (id) => names.get(id) ?? null,
    setHiddenCategories(ids) {
      hiddenIds = ids
      swarm?.setHidden(ids)
    },
    setColorMode(mode) {
      colorMode = mode
      swarm?.setColorBy(mode)
    },
    selectedOrbitRadius: () => (tracked ? kmToUnits(describeOrbit(tracked.record).apogeeKm + EARTH_EQUATORIAL_KM) : null),
    pick(camera, width, height, x, y) {
      if (!swarm) return null
      swarm.positionsAt(lastTime, pickPositions)
      const index = pickNearest(pickPositions, swarm.size, camera, width, height, x, y, SWARM_HIT_RADIUS_PX)
      return index === -1 ? null : swarm.ids[index]!
    },
    selectedPosition: () => (state ? new Vector3(...state.scene) : null),
    selectedOrbitNormal: () =>
      state ? new Vector3(...state.scene).cross(new Vector3(...state.velocity)).normalize() : null,
    update(date) {
      lastTime = date.getTime()
      if (swarm && swarmPoints) {
        swarm.update(lastTime)
        if (swarm.colorsVersion() !== uploadedColors) {
          swarmPoints.setColors(swarm.colors)
          uploadedColors = swarm.colorsVersion()
        }
        const sample = swarm.sample()
        if (sample) swarmPoints.setElapsed(extrapolationSeconds(lastTime, sample.epochMs))
        swarmPoints.setSun(sunDirectionScene(date))
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
      swarm?.dispose()
      clearTimeout(timer)
    },
  }
}
