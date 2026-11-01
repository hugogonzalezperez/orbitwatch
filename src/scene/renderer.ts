import { WebGLRenderer } from 'three'
import { MAX_PIXEL_RATIO } from '../app/config'

export const createRenderer = (): WebGLRenderer => {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))
  return renderer
}
