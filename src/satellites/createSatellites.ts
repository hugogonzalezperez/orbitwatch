import type { Points, WebGLRenderer } from 'three'
import { Vector3 } from 'three'
import { createStore, type Store } from '../shared/store'
import { epochDate, findIss } from './data/stations'
import { createTracked, stateAt, type SatelliteState, type Tracked } from './propagation/position'
import { SATELLITE_COLOR, SATELLITE_SIZE_PX } from './config'
import { createSatellitePoints } from './render/satellitePoints'

export type IssStatus =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  /** `state` es `null` si SGP4 no puede calcular la posición a esa hora. */
  | { kind: 'ready'; name: string; epoch: Date; state: SatelliteState | null }

export interface Satellites {
  object: Points
  issStatus: Store<IssStatus>
  /** Dirección unitaria hacia la ISS en la escena, o `null` si aún no hay posición. */
  issDirection(): Vector3 | null
  update(date: Date): void
  dispose(): void
}

const PUBLISH_INTERVAL_MS = 250 // React no necesita más de 4 actualizaciones por segundo

// shortcut: instantánea manual de CelesTrak (scripts/update-stations.sh), sin Action ni validación completa; ver plan B1-B7.
export function createSatellites(renderer: WebGLRenderer, { onChange }: { onChange: () => void }): Satellites {
  const points = createSatellitePoints(renderer, 1, { color: SATELLITE_COLOR, sizePx: SATELLITE_SIZE_PX })
  const issStatus = createStore<IssStatus>({ kind: 'loading' })
  let tracked: Tracked | undefined
  let lastState: SatelliteState | null = null
  let lastPublish = -Infinity
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  fetch(`${import.meta.env.BASE_URL}data/stations.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    })
    .then((json) => {
      if (disposed) return
      tracked = createTracked(findIss(json))
      issStatus.set({ kind: 'ready', name: tracked.record.OBJECT_NAME, epoch: epochDate(tracked.record), state: null })
      onChange()
    })
    .catch((error: unknown) => {
      if (disposed) return
      console.error('No se pudieron cargar los datos de la ISS', error)
      issStatus.set({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
    })

  const publish = () => {
    timer = undefined
    lastPublish = performance.now()
    if (tracked) issStatus.set({ kind: 'ready', name: tracked.record.OBJECT_NAME, epoch: epochDate(tracked.record), state: lastState })
  }

  return {
    object: points.object,
    issStatus,
    issDirection: () => (lastState ? new Vector3(...lastState.scene).normalize() : null),
    update(date) {
      if (!tracked) return
      lastState = stateAt(tracked, date)
      if (lastState) points.setPositions(lastState.scene, 1)
      else points.setPositions([], 0)
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
