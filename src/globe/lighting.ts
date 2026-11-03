import { AmbientLight, DirectionalLight, Group } from 'three'

const SUN_COLOR = 0xfff4e8 // luz solar sin filtrar: casi blanca
const LIGHT_DISTANCE = 5 // solo importa la dirección

interface Lighting {
  object: Group
  /** Apunta la luz hacia el Sol (dirección unitaria): el terminador y el brillo del mar son los de esa hora. */
  update(sun: readonly [number, number, number]): void
}

// El relleno ambiente es una licencia: sin él, el lado de noche sería negro puro.
export function createLighting(): Lighting {
  const sun = new DirectionalLight(SUN_COLOR, 2.5)
  const object = new Group().add(sun, new AmbientLight(0xffffff, 0.15))
  return {
    object,
    update(direction) {
      sun.position.set(...direction).multiplyScalar(LIGHT_DISTANCE)
    },
  }
}
