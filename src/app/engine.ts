import { createGlobe } from '../globe/createGlobe'
import { createCamera, updateClipPlanes } from '../scene/camera'
import { createControls } from '../scene/controls'
import { createRenderer } from '../scene/renderer'
import { createSpace } from '../scene/space'

/** Monta el globo en `container` y devuelve la función que libera todos los recursos. */
export function createEngine(container: HTMLElement): () => void {
  const renderer = createRenderer()
  const scene = createSpace()
  const camera = createCamera(1)
  const controls = createControls(camera, renderer.domElement)
  scene.add(createGlobe())
  container.appendChild(renderer.domElement)

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container
    if (!w || !h) return // contenedor oculto: aspect sería Infinity/NaN y la proyección quedaría rota
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()

  // El bucle de render lo pausa el navegador con la pestaña oculta (requestAnimationFrame).
  renderer.setAnimationLoop(() => {
    controls.update()
    updateClipPlanes(camera)
    renderer.render(scene, camera)
  })

  return () => {
    renderer.setAnimationLoop(null)
    observer.disconnect()
    controls.dispose()
    scene.traverse((o) => {
      const obj = o as { geometry?: { dispose(): void }; material?: { dispose(): void } }
      obj.geometry?.dispose()
      obj.material?.dispose()
    })
    renderer.dispose()
    renderer.forceContextLoss() // los navegadores limitan los contextos WebGL vivos (StrictMode/HMR crean varios)
    renderer.domElement.remove()
  }
}
