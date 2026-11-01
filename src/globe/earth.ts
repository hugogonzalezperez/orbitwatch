import { Mesh, MeshPhongMaterial, SphereGeometry, type Texture } from 'three'
import { EARTH_COLOR, EARTH_SEGMENTS, TEXTURE_FILES } from './config'
import type { TextureSource } from './textureSource'

// Phong y no PBR: al mar solo le hace falta un specular. Sin mapa normal: el relieve no se distingue al zoom mínimo.
export function createEarth(textures: TextureSource): Mesh {
  const material = new MeshPhongMaterial({ color: EARTH_COLOR, specular: 0x555555, shininess: 25 })
  const earth = new Mesh(new SphereGeometry(1, EARTH_SEGMENTS.width, EARTH_SEGMENTS.height), material)

  const setDay = (day: Texture) => {
    const previous = material.map
    material.map = day
    material.color.set(0xffffff) // el color multiplica al mapa
    material.needsUpdate = true // la primera vez cambia el shader: de sin mapa a con mapa
    previous?.dispose()
  }
  const setSpecular = (specular: Texture) => {
    material.specularMap = specular
    material.needsUpdate = true
  }

  // El 2K (≈220 kB) pinta rápido y el 8K (≈2,6 MB) lo sustituye al terminar de descargarse.
  void (async () => {
    await textures.load(TEXTURE_FILES.dayPreview, setDay)
    await textures.load(TEXTURE_FILES.specular, setSpecular)
    await textures.load(TEXTURE_FILES.dayFull, setDay)
  })()

  return earth
}
