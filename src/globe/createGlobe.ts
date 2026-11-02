import { gstime } from 'satellite.js'
import { Group, type WebGLRenderer } from 'three'
import { createAtmosphere } from './atmosphere'
import { createClouds } from './clouds'
import { CLOUDS_ENABLED } from './config'
import { createEarth } from './earth'
import { createGraticule } from './graticule'
import { createLighting } from './lighting'
import { createSunDisc } from './sunDisc'
import { createTextureSource } from './textureSource'

interface Globe {
  object: Group
  /** Gira la Tierra al ángulo sidéreo de `date` y coloca el Sol y su luz: la escena es inercial. */
  update(date: Date): void
  /** Libera texturas y cargador; geometrías y materiales los libera `disposeScene`. */
  dispose(): void
}

/** `invalidate` pide dibujar cuando llega una textura. */
export function createGlobe(renderer: WebGLRenderer, invalidate: () => void): Globe {
  const textures = createTextureSource(renderer, invalidate)
  const earth = new Group().add(createEarth(textures), createGraticule())
  if (CLOUDS_ENABLED) earth.add(createClouds(textures))
  const lighting = createLighting()
  const atmosphere = createAtmosphere()
  const sunDisc = createSunDisc()
  const object = new Group().add(earth, atmosphere.object, lighting.object, sunDisc.object) // ni la luz, ni el Sol ni el aire giran con la Tierra
  return {
    object,
    update(date) {
      earth.rotation.y = gstime(date) // +Y lleva +X hacia −Z: el este
      lighting.update(date)
      atmosphere.update(date)
      sunDisc.update(date)
    },
    dispose: textures.dispose,
  }
}
