import type { PerspectiveCamera } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { MAX_DISTANCE, MIN_DISTANCE } from '../app/config'

export const createControls = (camera: PerspectiveCamera, element: HTMLElement): OrbitControls => {
  const controls = new OrbitControls(camera, element)
  controls.enablePan = false // el globo siempre queda centrado
  controls.enableDamping = true
  controls.minDistance = MIN_DISTANCE
  controls.maxDistance = MAX_DISTANCE
  // Más lento cuanto más cerca de la superficie: da la sensación de zoom logarítmico de un globo tipo Google Earth.
  controls.zoomSpeed = 0.8
  return controls
}
