import { MathUtils } from 'three'
import { createGlobe } from '../globe/createGlobe'
import { createSatellites, type IssStatus, type SatelliteId } from '../satellites/createSatellites'
import { FOCUS_TILT_DEG, HIT_RADIUS_PX } from '../satellites/config'
import { createCamera } from '../scene/camera'
import { createControls } from '../scene/controls'
import { disposeScene } from '../scene/disposeScene'
import { isOccluded, projectToScreen } from '../scene/picking'
import { createRenderer } from '../scene/renderer'
import { createRenderLoop } from '../scene/renderLoop'
import { createSpace } from '../scene/space'
import { fitToContainer } from '../scene/viewport'
import { createStore, type Store } from '../shared/store'
import { animationIntervalMs, createClock, type Clock } from './clock'

export interface Engine {
  clock: Clock
  iss: Store<IssStatus>
  /** Qué satélite está seleccionado (panel abierto, órbita dibujada), o `null`. */
  selection: Store<SatelliteId | null>
  select(id: SatelliteId | null): void
  /** Coloca la cámara sobre la ISS, a la distancia actual. */
  focusIss(): void
  dispose(): void
}

const CLICK_MOVE_TOLERANCE_PX = 5 // más que eso es un arrastre para girar, no una pulsación

/** Monta el globo en `container`. Con `startTime` el reloj arranca en esa hora y en pausa. */
export function createEngine(container: HTMLElement, { startTime }: { startTime?: Date } = {}): Engine {
  const renderer = createRenderer()
  const scene = createSpace(renderer.getPixelRatio())
  const camera = createCamera()
  const controls = createControls(camera, renderer.domElement)
  const clock = createClock({ start: startTime, paused: startTime !== undefined })
  const selection = createStore<SatelliteId | null>(null)

  let userMoved = false
  controls.addEventListener('start', () => void (userMoved = true))

  let needsUpdate = true // hay que recalcular la escena aunque no toque por intervalo
  let lastUpdate = -Infinity
  const requestUpdate = () => {
    needsUpdate = true
  }
  const update = () => {
    const { paused, speed } = clock.state()
    const now = performance.now()
    if (!needsUpdate && (paused || now - lastUpdate < animationIntervalMs(speed))) return
    needsUpdate = false
    lastUpdate = now
    const date = clock.time()
    globe.update(date)
    satellites.update(date)
    loop.invalidate()
  }

  const loop = createRenderLoop(renderer, scene, camera, controls, update)
  const globe = createGlobe(renderer, loop.invalidate)
  const satellites = createSatellites(renderer, {
    onChange: () => {
      requestUpdate()
      if (!userMoved) focusIss() // si aún no has tocado nada, la primera vista es la ISS
    },
  })
  scene.add(globe.object, satellites.object)
  container.appendChild(renderer.domElement)
  const stopFitting = fitToContainer(container, renderer, camera, loop.invalidate)
  const stopClock = clock.subscribe(requestUpdate)
  const stopSelection = selection.subscribe(() => {
    satellites.setSelected(selection.get() === 'iss')
    requestUpdate()
  })

  const focusIss = () => {
    satellites.update(clock.time()) // posición al día aunque el reloj esté en pausa
    const position = satellites.issPosition()
    const normal = satellites.issOrbitNormal()
    if (!position || !normal) return
    const tilt = MathUtils.degToRad(FOCUS_TILT_DEG)
    const direction = position.normalize().multiplyScalar(Math.cos(tilt)).addScaledVector(normal, Math.sin(tilt))
    camera.position.copy(direction.multiplyScalar(camera.position.length()))
    controls.update()
    loop.invalidate()
  }

  // Pulsar sobre la ISS la selecciona; pulsar en el vacío, no. Un arrastre es girar, no pulsar.
  const canvas = renderer.domElement
  const isOverIss = (clientX: number, clientY: number): boolean => {
    const position = satellites.issPosition()
    if (!position || isOccluded(camera.position, position)) return false
    camera.updateMatrixWorld()
    const rect = canvas.getBoundingClientRect()
    const screen = projectToScreen(position, camera, rect.width, rect.height)
    return screen.inFront && Math.hypot(screen.x - (clientX - rect.left), screen.y - (clientY - rect.top)) <= HIT_RADIUS_PX
  }
  let pressedAt: { x: number; y: number } | null = null
  const onPointerDown = (event: PointerEvent) => void (pressedAt = { x: event.clientX, y: event.clientY })
  const onPointerUp = (event: PointerEvent) => {
    const start = pressedAt
    pressedAt = null
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_MOVE_TOLERANCE_PX) return
    selection.set(isOverIss(event.clientX, event.clientY) ? 'iss' : null)
  }
  const onPointerMove = (event: PointerEvent) => {
    if (event.buttons === 0) canvas.style.cursor = isOverIss(event.clientX, event.clientY) ? 'pointer' : ''
  }
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointermove', onPointerMove)

  return {
    clock,
    iss: satellites.issStatus,
    selection,
    select: selection.set,
    focusIss,
    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointermove', onPointerMove)
      loop.dispose()
      stopFitting()
      stopClock()
      stopSelection()
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
