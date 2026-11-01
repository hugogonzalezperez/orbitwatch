import { PerspectiveCamera } from 'three'
import { CAMERA_FOV_DEG, INITIAL_DISTANCE } from '../app/config'
import { clipPlanes } from './clipPlanes'

export const createCamera = (aspect: number): PerspectiveCamera => {
  const camera = new PerspectiveCamera(CAMERA_FOV_DEG, aspect)
  camera.position.set(0, 0.6, INITIAL_DISTANCE)
  camera.position.setLength(INITIAL_DISTANCE)
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
