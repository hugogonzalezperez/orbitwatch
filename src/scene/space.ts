import { Color, Scene } from 'three'
import { SPACE_COLOR } from '../app/config'

// Fondo negro liso. Las estrellas, si las añadimos, irán aquí.
export const createSpace = (): Scene => {
  const scene = new Scene()
  scene.background = new Color(SPACE_COLOR)
  return scene
}
