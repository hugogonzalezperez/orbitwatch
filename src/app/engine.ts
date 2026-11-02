import { MathUtils } from 'three'
import { createGlobe } from '../globe/createGlobe'
import { createSatellites, ISS_ID, type DataStatus, type SatelliteId, type SelectedInfo } from '../satellites/createSatellites'
import { FOCUS_TILT_DEG, SWARM_MIN_INTERVAL_MS } from '../satellites/config'
import { createCamera } from '../scene/camera'
import { createControls } from '../scene/controls'
import { disposeScene } from '../scene/disposeScene'
import { createFlight } from '../scene/flight'
import { focusDirection, framingDistance } from '../scene/framing'
import { projectToScreen, isOccluded } from '../scene/picking'
import { createRenderer } from '../scene/renderer'
import { createRenderLoop } from '../scene/renderLoop'
import { createSpace } from '../scene/space'
import { fitToContainer } from '../scene/viewport'
import { createStore, type Store } from '../shared/store'
import { animationIntervalMs, createClock, type Clock } from './clock'
import { createLabels } from './labels'

export interface Engine {
  clock: Clock
  data: Store<DataStatus>
  /** El satélite seleccionado con su posición actual, o `null`. */
  selected: Store<SelectedInfo | null>
  /** Número de catálogo del seleccionado (su órbita está dibujada), o `null`. */
  selection: Store<SatelliteId | null>
  /** Con `center`, la cámara vuela hasta él (o salta, con la animación reducida). */
  select(id: SatelliteId | null, options?: { center?: boolean }): void
  /** La cámara vuela sobre el seleccionado y se aleja lo necesario para ver su órbita entera. */
  focusSelected(): void
  /** Los satélites de estas categorías no se dibujan en el globo. */
  setHiddenCategories(ids: ReadonlySet<string>): void
  /** Atenúa en el globo los que no están en `ids`; `null` los muestra todos. */
  setHighlight(ids: ReadonlySet<number> | null): void
  dispose(): void
}

const CLICK_MOVE_TOLERANCE_PX = 5 // más que eso es un arrastre para girar, no una pulsación
const FLIGHT_MS = 700
const LABEL_LEFT_FROM = 0.6 // fracción del ancho a partir de la cual la etiqueta del seleccionado pasa a su izquierda
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Monta el globo en `container`. Con `startTime` el reloj arranca en esa hora y en pausa. */
export function createEngine(container: HTMLElement, { startTime }: { startTime?: Date } = {}): Engine {
  const renderer = createRenderer()
  const scene = createSpace(renderer.getPixelRatio())
  const camera = createCamera()
  const controls = createControls(camera, renderer.domElement)
  const clock = createClock({ start: startTime, paused: startTime !== undefined })
  const selection = createStore<SatelliteId | null>(null)

  let userMoved = false
  let flight: ReturnType<typeof createFlight> | null = null
  let flightStart = 0
  controls.addEventListener('start', () => {
    userMoved = true
    flight = null // si tomas los mandos, el vuelo se cancela
  })
  const labels = createLabels(container)
  // La etiqueta del seleccionado solo se recoloca si algo pudo moverla: la cámara, el satélite o el tamaño.
  let labelDirty = true
  controls.addEventListener('change', () => void (labelDirty = true))
  const flushLabel = () => {
    if (!labelDirty) return
    labelDirty = false
    placeSelectedLabel()
  }

  let needsUpdate = true // hay que recalcular la escena aunque no toque por intervalo
  let lastUpdate = -Infinity
  let lastSwarmUpdate = -Infinity
  const requestUpdate = () => {
    needsUpdate = true
  }
  const update = () => {
    if (flight) {
      const elapsed = performance.now() - flightStart
      camera.position.copy(flight.position(elapsed))
      controls.update()
      loop.invalidate()
      labelDirty = true
      if (flight.finished(elapsed)) flight = null
    }
    const { paused, speed } = clock.state()
    const now = performance.now()
    if (!needsUpdate && (paused || now - lastUpdate < animationIntervalMs(speed))) return flushLabel()
    // Un cambio explícito (pausa, salto, velocidad) recalcula todo; en la animación continua, el enjambre va a su ritmo.
    const swarm = needsUpdate || now - lastSwarmUpdate >= SWARM_MIN_INTERVAL_MS
    needsUpdate = false
    lastUpdate = now
    if (swarm) lastSwarmUpdate = now
    const date = clock.time()
    globe.update(date)
    satellites.update(date, { swarm })
    labelDirty = true
    flushLabel()
    loop.invalidate()
  }

  const loop = createRenderLoop(renderer, scene, camera, controls, update)
  const globe = createGlobe(renderer, loop.invalidate)
  const satellites = createSatellites(renderer, {
    onChange: () => {
      requestUpdate()
      if (!userMoved) select(ISS_ID, { center: true, animate: false }) // si aún no has tocado nada, la primera vista es la ISS
    },
  })
  scene.add(globe.object, satellites.object)
  container.appendChild(renderer.domElement)
  const stopFitting = fitToContainer(container, renderer, camera, () => {
    labelDirty = true
    loop.invalidate()
  })
  const stopClock = clock.subscribe(requestUpdate)
  const stopSelection = selection.subscribe(() => {
    satellites.select(selection.get())
    requestUpdate()
  })
  const stopSelected = satellites.selected.subscribe(() => {
    labels.setSelected(satellites.selected.get()?.name ?? null)
    labelDirty = true
  })

  /** Pone la etiqueta del seleccionado junto a su punto, si se ve. */
  const placeSelectedLabel = () => {
    const position = satellites.selectedPosition()
    if (!position || isOccluded(camera.position, position)) return labels.placeSelected(null)
    const { clientWidth: width, clientHeight: height } = container
    const screen = projectToScreen(position, camera, width, height)
    const inside = screen.inFront && screen.x >= 0 && screen.x <= width && screen.y >= 0 && screen.y <= height
    labels.placeSelected(inside ? screen : null, screen.x > width * LABEL_LEFT_FROM) // cerca del borde derecho, donde está la ficha, el nombre va a la izquierda
  }

  const focusSelected = (animate = true) => {
    satellites.update(clock.time(), { swarm: false }) // posición al día aunque el reloj esté en pausa
    const position = satellites.selectedPosition()
    const normal = satellites.selectedOrbitNormal()
    const orbitRadius = satellites.selectedOrbitRadius()
    if (!position || !normal || orbitRadius === null) return
    const tilt = MathUtils.degToRad(FOCUS_TILT_DEG)
    const direction = focusDirection(position, normal, tilt)
    const distance = framingDistance({ orbitRadius, tiltRad: tilt, fovDeg: camera.fov, aspect: camera.aspect, currentDistance: camera.position.length() })
    const target = direction.multiplyScalar(distance)
    if (animate && !prefersReducedMotion()) {
      flight = createFlight(camera.position, target, FLIGHT_MS)
      flightStart = performance.now()
    } else {
      flight = null
      camera.position.copy(target)
      controls.update()
    }
    loop.invalidate()
  }

  const select = (id: SatelliteId | null, { center = false, animate = true }: { center?: boolean; animate?: boolean } = {}) => {
    selection.set(id)
    if (center) focusSelected(animate)
  }

  // Pulsar sobre un satélite lo selecciona; pulsar en el vacío, no. Un arrastre es girar, no pulsar.
  const canvas = renderer.domElement
  const satelliteAt = (clientX: number, clientY: number): SatelliteId | null => {
    const rect = canvas.getBoundingClientRect()
    return satellites.pick(camera, rect.width, rect.height, clientX - rect.left, clientY - rect.top)
  }
  let pressedAt: { x: number; y: number } | null = null
  const onPointerDown = (event: PointerEvent) => void (pressedAt = { x: event.clientX, y: event.clientY })
  const onPointerUp = (event: PointerEvent) => {
    const start = pressedAt
    pressedAt = null
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_MOVE_TOLERANCE_PX) return
    selection.set(satelliteAt(event.clientX, event.clientY))
  }
  const onPointerMove = (event: PointerEvent) => {
    if (event.buttons !== 0) return labels.hover(null)
    const id = satelliteAt(event.clientX, event.clientY)
    canvas.style.cursor = id === null ? '' : 'pointer'
    const name = id === null || id === selection.get() ? null : satellites.nameOf(id) // el seleccionado ya tiene su etiqueta
    const rect = canvas.getBoundingClientRect()
    labels.hover(name, { x: event.clientX - rect.left, y: event.clientY - rect.top })
  }
  const onPointerLeave = () => labels.hover(null)
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerleave', onPointerLeave)

  return {
    clock,
    data: satellites.data,
    selected: satellites.selected,
    selection,
    select,
    focusSelected: () => focusSelected(),
    setHiddenCategories(ids) {
      satellites.setHiddenCategories(ids)
      requestUpdate()
    },
    setHighlight(ids) {
      satellites.setHighlight(ids)
      requestUpdate() // el enjambre se recalcula con las nuevas opacidades en el siguiente fotograma
    },
    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      loop.dispose()
      stopFitting()
      stopClock()
      stopSelection()
      stopSelected()
      labels.dispose()
      controls.dispose()
      globe.dispose()
      satellites.dispose()
      disposeScene(scene)
      renderer.dispose()
      renderer.forceContextLoss() // los navegadores limitan los contextos WebGL vivos (StrictMode y HMR crean varios)
      renderer.domElement.remove()
    },
  }
}
