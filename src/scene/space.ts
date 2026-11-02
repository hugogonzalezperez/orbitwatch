import { Color, Scene } from 'three'
import { SPACE_COLOR } from './config'
import { createStarfield } from './starfield'

export const createSpace = (pixelRatio: number): Scene => {
  const scene = new Scene()
  scene.background = new Color(SPACE_COLOR)
  scene.add(createStarfield(pixelRatio))
  return scene
}
