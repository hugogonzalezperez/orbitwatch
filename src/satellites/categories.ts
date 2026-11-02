export interface Category {
  id: string
  label: string
  /** Qué es un objeto de esta categoría, en singular, para la ficha. */
  kind: string
  /** Color de sus puntos en el globo y de su marca en la leyenda. El ámbar queda para el objeto seleccionado. */
  color: number
  /** Opacidad de sus puntos en el globo: las categorías enormes se apagan para que no tapen a las demás. */
  opacity: number
  /** Grupos de CelesTrak cuyos objetos recibe. */
  groups: readonly string[]
  /** Parte oculta en el globo (los restos saturarían la vista de entrada). */
  hiddenByDefault?: boolean
}

/**
 * Categorías por función. El orden es la prioridad: un objeto que está en varios grupos de CelesTrak recibe la primera
 * categoría de esta lista que tenga alguno de ellos.
 */
export const CATEGORIES: readonly Category[] = [
  { id: 'stations', label: 'Estaciones y naves', kind: 'Estación o nave', color: 0xe9e4d4, opacity: 1, groups: ['stations'] },
  { id: 'weather', label: 'Meteorología', kind: 'Satélite meteorológico', color: 0x7fe0b4, opacity: 1, groups: ['weather'] },
  { id: 'navigation', label: 'Navegación', kind: 'Satélite de navegación', color: 0xb69cf0, opacity: 1, groups: ['gnss'] },
  { id: 'starlink', label: 'Starlink', kind: 'Satélite Starlink', color: 0x8fa3bf, opacity: 0.6, groups: ['starlink'] },
  { id: 'constellations', label: 'Otras constelaciones', kind: 'Satélite de comunicaciones', color: 0x62c4d9, opacity: 0.8, groups: ['oneweb', 'iridium-NEXT', 'globalstar', 'orbcomm'] },
  { id: 'earth-observation', label: 'Observación de la Tierra', kind: 'Satélite de observación', color: 0xd98fb4, opacity: 1, groups: ['resource', 'sar', 'planet'] },
  { id: 'science', label: 'Ciencia', kind: 'Satélite científico', color: 0xa3d977, opacity: 1, groups: ['science'] },
  { id: 'military', label: 'Militares', kind: 'Satélite militar', color: 0xc4a484, opacity: 1, groups: ['military'] },
  { id: 'geo', label: 'Geoestacionarios', kind: 'Satélite geoestacionario', color: 0xd98880, opacity: 1, groups: ['geo'] },
  { id: 'amateur', label: 'Radioaficionados', kind: 'Satélite de radioaficionados', color: 0x8f9cf0, opacity: 1, groups: ['amateur'] },
  { id: 'cubesat', label: 'CubeSats', kind: 'CubeSat', color: 0xe08fe0, opacity: 0.9, groups: ['cubesat'] },
  { id: 'other', label: 'Otros activos', kind: 'Satélite activo', color: 0x9aa5b1, opacity: 0.8, groups: ['active'] },
  {
    id: 'debris',
    label: 'Restos de colisiones',
    kind: 'Resto de una colisión',
    color: 0x8a7f78,
    opacity: 0.55,
    groups: ['fengyun-1c-debris', 'iridium-33-debris', 'cosmos-2251-debris'],
    hiddenByDefault: true,
  },
]

const FALLBACK: Category = { id: 'other', label: 'Otros activos', kind: 'Satélite', color: 0x9aa5b1, opacity: 1, groups: [] }

export const getCategory = (id: string): Category => CATEGORIES.find((c) => c.id === id) ?? { ...FALLBACK, id, label: id }
