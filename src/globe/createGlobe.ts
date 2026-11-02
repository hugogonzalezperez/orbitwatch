import { gstime } from 'satellite.js'
import { Group, type WebGLRenderer } from 'three'
import { createClouds } from './clouds'
import { CLOUDS_ENABLED } from './config'
import { createEarth } from './earth'
import { createGraticule } from './graticule'
import { createLighting } from './lighting'
import { createTextureSource } from './textureSource'

export interface Globe {
  object: Group
  /** Gira la Tierra al ángulo sidéreo de `date`: la escena es inercial y la Tierra gira dentro de ella. */
  update(date: Date): void
  /** Libera texturas y cargador; geometrías y materiales los libera `disposeScene`. */
  dispose(): void
}

/** `invalidate` pide dibujar cuando llega una textura. */
export function createGlobe(renderer: WebGLRenderer, invalidate: () => void): Globe {
  const textures = createTextureSource(renderer, invalidate)
  const earth = new Group().add(createEarth(textures), createGraticule())
  if (CLOUDS_ENABLED) earth.add(createClouds(textures))
  const object = new Group().add(earth, createLighting()) // la luz no gira con la Tierra
  return {
    object,
    update: (date) => void (earth.rotation.y = gstime(date)), // +Y lleva +X hacia −Z: el este
    dispose: textures.dispose,
  }
}
