import type { PerspectiveCamera, WebGLRenderer } from 'three'

/** Ajusta renderer y cámara al tamaño del contenedor y avisa con `onResize`. Devuelve la función que deja de observarlo. */
export function fitToContainer(
  container: HTMLElement,
  renderer: WebGLRenderer,
  camera: PerspectiveCamera,
  onResize: () => void,
): () => void {
  const fit = () => {
    const { clientWidth: width, clientHeight: height } = container
    if (!width || !height) return // contenedor oculto: el aspecto sería NaN y la proyección quedaría rota
    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    onResize()
  }
  const observer = new ResizeObserver(fit)
  observer.observe(container)
  fit()
  return () => observer.disconnect()
}
