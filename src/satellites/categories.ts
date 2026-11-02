export interface Category {
  /** Coincide con el grupo de CelesTrak del que sale. */
  id: string
  label: string
  /** Qué es un objeto de esta categoría, en singular, para la ficha. */
  kind: string
  /** Color de sus puntos en el globo y de su marca en la leyenda. El ámbar queda para el objeto seleccionado. */
  color: number
  /** Opacidad de sus puntos en el globo: Starlink son miles y, apagados, dejan ver la Tierra y al resto. */
  opacity: number
}

export const CATEGORIES: readonly Category[] = [
  { id: 'stations', label: 'Estaciones y naves', kind: 'Estación o nave', color: 0xe9e4d4, opacity: 1 },
  { id: 'weather', label: 'Meteorología', kind: 'Satélite meteorológico', color: 0x7fe0b4, opacity: 1 },
  { id: 'starlink', label: 'Starlink', kind: 'Satélite Starlink', color: 0x8fa3bf, opacity: 0.6 },
]

const FALLBACK_COLOR = 0x9aa5b1

export const getCategory = (id: string): Category =>
  CATEGORIES.find((c) => c.id === id) ?? { id, label: id, kind: 'Satélite', color: FALLBACK_COLOR, opacity: 1 }
