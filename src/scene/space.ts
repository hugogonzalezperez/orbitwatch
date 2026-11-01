import { Color, Scene } from 'three'
import { SPACE_COLOR } from './config'

export const createSpace = (): Scene => {
  const scene = new Scene()
  scene.background = new Color(SPACE_COLOR)
  return scene
}
