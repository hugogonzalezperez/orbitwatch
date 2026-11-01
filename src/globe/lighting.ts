import { AmbientLight, DirectionalLight, Group } from 'three'

// Luz fija por ahora; más adelante seguirá la posición real del Sol (línea día/noche).
export const createLighting = (): Group => {
  const sun = new DirectionalLight(0xffffff, 2.5)
  sun.position.set(5, 2, 3)
  return new Group().add(sun, new AmbientLight(0xffffff, 0.15))
}
