import type { PerspectiveCamera, Scene } from 'three'
import { updateClipPlanes } from './camera'

interface LoopRenderer {
  setAnimationLoop(callback: (() => void) | null): void
  render(scene: Scene, camera: PerspectiveCamera): void
}

interface LoopControls {
  update(): unknown
  addEventListener(type: 'change', listener: () => void): void
}

interface RenderLoop {
  /** Pide dibujar en el próximo fotograma. Hay que llamarla al cambiar algo de la escena que no sea la cámara. */
  invalidate(): void
  dispose(): void
}

/** Dibuja solo cuando algo cambia: un globo quieto no gasta GPU. `onFrame` corre en cada fotograma, dibuje o no. */
export function createRenderLoop(
  renderer: LoopRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  controls: LoopControls,
  onFrame?: () => void,
): RenderLoop {
  let dirty = true
  const invalidate = () => {
    dirty = true
  }
  // El valor de update() no vale: la rueda y el arrastre ya lo llaman y el bucle vería false.
  controls.addEventListener('change', invalidate)

  renderer.setAnimationLoop(() => {
    controls.update()
    onFrame?.() // puede llamar a invalidate()
    if (!dirty) return
    dirty = false
    updateClipPlanes(camera)
    renderer.render(scene, camera)
  })

  return { invalidate, dispose: () => renderer.setAnimationLoop(null) }
}
