import { CATEGORIES, getCategory, type Category } from './categories'
import type { OmmRecord } from './data/omm'

export interface CatalogEntry {
  /** Número de catálogo NORAD. */
  id: number
  name: string
  category: string
  designator: string
  /** Texto en minúsculas y sin tildes sobre el que se busca. */
  searchKey: string
}

export interface CategoryGroup {
  category: Category
  entries: CatalogEntry[]
}

/** Minúsculas y sin tildes, para buscar sin pensar en ellas. */
export const normalize = (text: string): string => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const categoryRank = (id: string): number => {
  const rank = CATEGORIES.findIndex((c) => c.id === id)
  return rank === -1 ? CATEGORIES.length : rank
}

/** Un objeto por número de catálogo (gana el primer grupo que lo trae), ordenado por categoría y nombre. */
export function buildCatalog(groups: Array<{ name: string; records: OmmRecord[] }>): CatalogEntry[] {
  const seen = new Set<number>()
  const entries: CatalogEntry[] = []
  for (const { name: category, records } of groups) {
    for (const record of records) {
      if (seen.has(record.NORAD_CAT_ID)) continue
      seen.add(record.NORAD_CAT_ID)
      const name = record.OBJECT_NAME || `Sin nombre (${record.NORAD_CAT_ID})`
      entries.push({
        id: record.NORAD_CAT_ID,
        name,
        category,
        designator: record.OBJECT_ID,
        searchKey: normalize(`${name} ${record.NORAD_CAT_ID} ${record.OBJECT_ID}`),
      })
    }
  }
  return entries.sort((a, b) => categoryRank(a.category) - categoryRank(b.category) || a.name.localeCompare(b.name, 'en', { numeric: true }))
}

/** Los que contienen todas las palabras de `query`, en cualquier orden. Sin consulta devuelve la misma lista. */
export function searchEntries(entries: CatalogEntry[], query: string): CatalogEntry[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return entries
  return entries.filter((entry) => words.every((word) => entry.searchKey.includes(word)))
}

/** Agrupa una lista ya ordenada por categoría; no devuelve categorías vacías. */
export function groupByCategory(entries: CatalogEntry[]): CategoryGroup[] {
  const groups: CategoryGroup[] = []
  for (const entry of entries) {
    const last = groups.at(-1)
    if (last?.category.id === entry.category) last.entries.push(entry)
    else groups.push({ category: getCategory(entry.category), entries: [entry] })
  }
  return groups
}

/**
 * Hasta `limit` resultados para el desplegable del buscador: primero el número de catálogo exacto, luego los nombres que
 * empiezan por la consulta, luego los que la contienen. Sin consulta no propone nada.
 */
export function rankResults(entries: CatalogEntry[], query: string, limit: number): CatalogEntry[] {
  const text = normalize(query).trim()
  if (text === '') return []
  const score = (entry: CatalogEntry): number => {
    if (String(entry.id) === text) return 0
    const name = normalize(entry.name)
    if (name.startsWith(text)) return 1
    return 2
  }
  return searchEntries(entries, query)
    .map((entry) => ({ entry, rank: score(entry) }))
    .sort((a, b) => a.rank - b.rank) // estable: dentro de cada grupo se mantiene el orden del catálogo
    .slice(0, limit)
    .map(({ entry }) => entry)
}
