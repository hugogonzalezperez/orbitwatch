import type { Store } from '../shared/store'
import { createGlobe } from '../globe/createGlobe'
import { createSatellites, type IssStatus } from '../satellites/createSatellites'
import { createCamera } from '../scene/camera'
import { createControls } from '../scene/controls'
import { disposeScene } from '../scene/disposeScene'
import { createRenderer } from '../scene/renderer'
import { createRenderLoop } from '../scene/renderLoop'
import { createSpace } from '../scene/space'
import { fitToContainer } from '../scene/viewport'
import { animationIntervalMs, createClock, type Clock } from './clock'

export interface Engine {
  clock: Clock
  iss: Store<IssStatus>
  /** Coloca la cámara sobre la ISS, a la distancia actual. */
  focusIss(): void
  dispose(): void
}

/** Monta el globo en `container`. Con `startTime` el reloj arranca en esa hora y en pausa. */
export function createEngine(container: HTMLElement, { startTime }: { startTime?: Date } = {}): Engine {
  const renderer = createRenderer()
  const scene = createSpace()
  const camera = createCamera()
  const controls = createControls(camera, renderer.domElement)
  const clock = createClock({ start: startTime, paused: startTime !== undefined })

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
  const stopListening = clock.subscribe(requestUpdate)

  const focusIss = () => {
    satellites.update(clock.time()) // posición al día aunque el reloj esté en pausa
    const direction = satellites.issDirection()
    if (!direction) return
    camera.position.copy(direction.multiplyScalar(camera.position.length()))
    controls.update()
    loop.invalidate()
  }

  return {
    clock,
    iss: satellites.issStatus,
    focusIss,
    dispose() {
      loop.dispose()
      stopFitting()
      stopListening()
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
