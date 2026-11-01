import { Mesh, MeshLambertMaterial, SphereGeometry } from 'three'
import { CLOUD_RADIUS, CLOUD_SEGMENTS, TEXTURE_FILES } from './config'
import type { TextureSource } from './textureSource'

// Foto fija de nubes, no el tiempo real. Una textura de un canal hace de opacidad.
export function createClouds(textures: TextureSource): Mesh {
  const material = new MeshLambertMaterial({ color: 0xffffff, transparent: true, depthWrite: false })
  const clouds = new Mesh(new SphereGeometry(CLOUD_RADIUS, CLOUD_SEGMENTS.width, CLOUD_SEGMENTS.height), material)
  clouds.renderOrder = 1 // después de la Tierra y de la rejilla
  clouds.visible = false // sin textura sería una esfera blanca opaca

  void textures.load(TEXTURE_FILES.clouds, (alpha) => {
    material.alphaMap = alpha
    material.needsUpdate = true
    clouds.visible = true
  })

  return clouds
}
