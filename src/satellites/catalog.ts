import { CATEGORIES, getCategory, type Category } from './categories'
import type { CatalogColumns } from './data/columns'
import { describeOwner } from './origin'

export interface CatalogEntry {
  /** Número de catálogo NORAD. */
  id: number
  name: string
  category: string
  designator: string
  /** Código de propietario del SATCAT ("US", "PRC", "ESA"…). */
  owner: string
  /** Texto en minúsculas y sin tildes sobre el que se busca. */
  searchKey: string
}

export interface CategoryGroup {
  category: Category
  entries: CatalogEntry[]
}

/** Minúsculas y sin tildes, para buscar sin pensar en ellas. */
export const normalize = (text: string): string => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const NAME_ORDER = new Intl.Collator('en', { numeric: true }) // Reutilizado: `localeCompare` suelto crea un comparador por llamada (344 ms frente a 15 ms con 11 156 nombres)

const categoryRank = (id: string): number => {
  const rank = CATEGORIES.findIndex((c) => c.id === id)
  return rank === -1 ? CATEGORIES.length : rank
}

/** Una entrada por satélite de las columnas, ordenadas por categoría y nombre. */
export function buildCatalog(columns: CatalogColumns): CatalogEntry[] {
  const entries = columns.id.map((id, i): CatalogEntry => {
    const name = columns.name[i] || `Sin nombre (${id})`
    const designator = columns.designator[i]!
    const owner = columns.owner[i]!
    return {
      id,
      name,
      category: columns.categories[columns.category[i]!]!,
      designator,
      owner,
      searchKey: normalize(`${name} ${id} ${designator}`),
    }
  })
  return entries.sort((a, b) => categoryRank(a.category) - categoryRank(b.category) || NAME_ORDER.compare(a.name, b.name))
}

/** Los de un propietario; con `owner` vacío, todos. */
export const filterByOwner = (entries: CatalogEntry[], owner: string): CatalogEntry[] => (owner ? entries.filter((e) => e.owner === owner) : entries)

/** Cuántos objetos tiene cada propietario, de más a menos; a igual número, por nombre. */
export function countByOwner(entries: CatalogEntry[]): Array<{ owner: string; name: string; count: number }> {
  const counts = new Map<string, number>()
  for (const { owner } of entries) counts.set(owner, (counts.get(owner) ?? 0) + 1)
  return [...counts]
    .map(([owner, count]) => ({ owner, name: describeOwner(owner), count }))
    .sort((a, b) => b.count - a.count || NAME_ORDER.compare(a.name, b.name))
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
 * Hasta `limit` resultados para el desplegable: primero el número de catálogo exacto, luego los nombres que empiezan por la
 * consulta y luego los que la contienen. Sin consulta no propone nada.
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
