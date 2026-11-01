import { createGlobe } from '../globe/createGlobe'
import { createCamera } from '../scene/camera'
import { createControls } from '../scene/controls'
import { disposeScene } from '../scene/disposeScene'
import { createRenderer } from '../scene/renderer'
import { createRenderLoop } from '../scene/renderLoop'
import { createSpace } from '../scene/space'
import { fitToContainer } from '../scene/viewport'

/** Monta el globo en `container` y devuelve la función que libera todos los recursos. */
export function createEngine(container: HTMLElement): () => void {
  const renderer = createRenderer()
  const scene = createSpace()
  const camera = createCamera()
  const controls = createControls(camera, renderer.domElement)
  const loop = createRenderLoop(renderer, scene, camera, controls)
  const globe = createGlobe(renderer, loop.invalidate)
  scene.add(globe.object)
  container.appendChild(renderer.domElement)
  const stopFitting = fitToContainer(container, renderer, camera, loop.invalidate)

  return () => {
    loop.dispose()
    stopFitting()
    controls.dispose()
    globe.dispose()
    disposeScene(scene)
    renderer.dispose()
    renderer.forceContextLoss() // los navegadores limitan los contextos WebGL vivos (StrictMode y HMR crean varios)
    renderer.domElement.remove()
  }
}
