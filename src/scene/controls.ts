import type { PerspectiveCamera } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { MAX_DISTANCE, MIN_DISTANCE } from './config'

export const createControls = (camera: PerspectiveCamera, element: HTMLElement): OrbitControls => {
  const controls = new OrbitControls(camera, element)
  controls.enablePan = false // el globo siempre queda centrado
  controls.enableDamping = true
  controls.minDistance = MIN_DISTANCE
  controls.maxDistance = MAX_DISTANCE
  // El zoom escala la distancia: cada paso es más fino cuanto más cerca de la superficie.
  controls.zoomSpeed = 0.8
  return controls
}
