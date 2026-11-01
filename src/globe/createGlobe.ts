import { Group, type WebGLRenderer } from 'three'
import { createClouds } from './clouds'
import { CLOUDS_ENABLED } from './config'
import { createEarth } from './earth'
import { createGraticule } from './graticule'
import { createLighting } from './lighting'
import { createTextureSource } from './textureSource'

export interface Globe {
  object: Group
  /** Libera texturas y cargador; geometrías y materiales los libera `disposeScene`. */
  dispose(): void
}

/** `invalidate` pide dibujar cuando llega una textura. */
export function createGlobe(renderer: WebGLRenderer, invalidate: () => void): Globe {
  const textures = createTextureSource(renderer, invalidate)
  const object = new Group().add(createEarth(textures), createGraticule(), createLighting())
  if (CLOUDS_ENABLED) object.add(createClouds(textures))
  return { object, dispose: textures.dispose }
}
