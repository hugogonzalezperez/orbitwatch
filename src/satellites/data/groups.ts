import { CATEGORIES } from '../categories'
import type { GroupSpec } from './fetchGroups'

/** Menos objetos válidos que esto y el grupo se rechaza entero: la mitad de lo observado el 2026-11-02, para detectar solo una respuesta rota. */
const MIN_OBJECTS: Record<string, number> = {
  stations: 3,
  weather: 10,
  gnss: 50,
  starlink: 5_000,
  oneweb: 200,
  'iridium-NEXT': 30,
  globalstar: 10,
  orbcomm: 5,
  resource: 50,
  sar: 40,
  planet: 40,
  science: 15,
  military: 15,
  geo: 200,
  amateur: 30,
  cubesat: 25,
  active: 10_000,
  'fengyun-1c-debris': 800,
  'iridium-33-debris': 40,
  'cosmos-2251-debris': 250,
}

/** Grupos de CelesTrak que se descargan: los de todas las categorías, sin repetir. */
export const DATA_GROUPS: GroupSpec[] = [...new Set(CATEGORIES.flatMap((c) => c.groups))].map((name) => ({
  name,
  minObjects: MIN_OBJECTS[name] ?? 1,
}))
