import { MathUtils, PerspectiveCamera } from 'three'
import { CAMERA_FOV_DEG, INITIAL_DISTANCE, INITIAL_ELEVATION_DEG } from './config'
import { clipPlanes } from './clipPlanes'

/** El aspecto lo fija `fitToContainer` al conocer el tamaño real. */
export const createCamera = (): PerspectiveCamera => {
  const camera = new PerspectiveCamera(CAMERA_FOV_DEG, 1)
  camera.position.setFromSphericalCoords(INITIAL_DISTANCE, MathUtils.degToRad(90 - INITIAL_ELEVATION_DEG), 0)
  updateClipPlanes(camera)
  return camera
}

/** Llamar tras mover la cámara; solo toca la matriz de proyección si near/far cambian. */
export function updateClipPlanes(camera: PerspectiveCamera): void {
  const { near, far } = clipPlanes(camera.position.length())
  if (near === camera.near && far === camera.far) return
  camera.near = near
  camera.far = far
  camera.updateProjectionMatrix()
}
