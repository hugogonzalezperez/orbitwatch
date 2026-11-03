import { CATEGORIES } from '../satellites/categories'

/** Las categorías que parten ocultas (los restos). */
export const DEFAULT_HIDDEN: ReadonlySet<string> = new Set(CATEGORIES.filter((c) => c.hiddenByDefault).map((c) => c.id))
