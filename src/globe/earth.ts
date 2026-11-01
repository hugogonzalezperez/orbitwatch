import { Mesh, MeshStandardMaterial, SphereGeometry } from 'three'
import { EARTH_COLOR } from '../app/config'

// Sin texturas todavía: azul mate. El relieve irá en un mapa normal, no en geometría.
export const createEarth = (): Mesh =>
  new Mesh(
    new SphereGeometry(1, 128, 64),
    new MeshStandardMaterial({ color: EARTH_COLOR, roughness: 1, metalness: 0 }),
  )
