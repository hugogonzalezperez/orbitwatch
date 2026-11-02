import { AmbientLight, DirectionalLight, Group } from 'three'
import { sunDirectionScene } from '../shared/sun'

const SUN_COLOR = 0xfff4e8 // luz solar sin filtrar: casi blanca
const LIGHT_DISTANCE = 5 // solo importa la dirección

interface Lighting {
  object: Group
  /** Apunta la luz al Sol de `date`: el terminador y el brillo del mar son los de esa hora. */
  update(date: Date): void
}

// El relleno ambiente es una licencia: sin él, el lado de noche sería negro puro.
export function createLighting(): Lighting {
  const sun = new DirectionalLight(SUN_COLOR, 2.5)
  const object = new Group().add(sun, new AmbientLight(0xffffff, 0.15))
  return {
    object,
    update(date) {
      sun.position.set(...sunDirectionScene(date)).multiplyScalar(LIGHT_DISTANCE)
    },
  }
}
