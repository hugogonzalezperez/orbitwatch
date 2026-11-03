import { CATEGORIES } from '../categories'
import type { GroupSpec } from './fetchGroups'

/** Menos objetos válidos que esto y el grupo se rechaza entero: aprox. la mitad de lo observado (2026-11-02 y 2026-11-03), para detectar solo una respuesta rota. */
const MIN_OBJECTS: Record<string, number> = {
  stations: 3,
  weather: 10,
  gnss: 50,
  starlink: 5_000,
  oneweb: 200,
  'iridium-NEXT': 30,
  globalstar: 10,
  orbcomm: 5,
  sbas: 10,
  kuiper: 190,
  qianfan: 125,
  hulianwang: 115,
  spire: 35,
  dmc: 4,
  argos: 15,
  geodetic: 5,
  engineering: 18,
  education: 3,
  radar: 5,
  intelsat: 27,
  ses: 35,
  eutelsat: 14,
  telesat: 8,
  tdrss: 13,
  sarsat: 40,
  'other-comm': 15,
  'x-comm': 10,
  satnogs: 300,
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

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/**
 * Cuánto tiempo se puede reutilizar lo ya descargado de cada dirección. Los elementos de `active` (todos los satélites en
 * activo) cambian cada 2 h; la pertenencia a un grupo y el SATCAT, que CelesTrak actualiza una o dos veces al día, mucho
 * menos. Así una ejecución cada 2 h pide una sola dirección, y las demás (y el SATCAT) solo una vez al día. Los 100 minutos
 * hacen que una ejecución cada 2 h siempre vuelva a descargar `active`.
 */
export function cacheMaxAgeMs(url: string): number {
  return url.includes('GROUP=active&') ? 100 * MINUTE : 22 * HOUR
}
