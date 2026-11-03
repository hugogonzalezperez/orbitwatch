import type { ColorMode } from '../satellites/regimes'

/** Lo que un enlace puede llevar: qué satélite, qué país, qué categorías ocultas, cómo se colorea y a qué hora. */
export interface ShareState {
  sat: number | null
  owner: string
  hidden: ReadonlySet<string>
  color: ColorMode
  time: Date | null
}

const OWNER_PATTERN = /^[A-Z0-9]{1,6}$/
const CATEGORY_PATTERN = /^[a-z0-9-]+$/

/** Lee el estado de `search` (`?sat=…&owner=…&hide=…&t=…`); lo que no tiene forma válida se ignora. */
export function readShareState(search: string, defaults: ReadonlySet<string>): ShareState {
  const params = new URLSearchParams(search)
  const sat = Number(params.get('sat'))
  const owner = params.get('owner') ?? ''
  const hide = params.get('hide')
  const time = new Date(params.get('t') ?? NaN)
  return {
    sat: Number.isInteger(sat) && sat > 0 ? sat : null,
    owner: OWNER_PATTERN.test(owner) ? owner : '',
    hidden: hide === null ? defaults : new Set(hide.split(',').filter((id) => CATEGORY_PATTERN.test(id))),
    color: params.get('color') === 'regime' ? 'regime' : 'category',
    time: Number.isNaN(time.getTime()) ? null : time,
  }
}

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => a.size === b.size && [...a].every((id) => b.has(id))

/** `search` con el estado puesto: solo se escribe lo que se aparta de lo habitual, y se conservan los demás parámetros. */
export function writeShareState(search: string, state: ShareState, defaults: ReadonlySet<string>): string {
  const params = new URLSearchParams(search)
  for (const key of ['sat', 'owner', 'hide', 'color', 't']) params.delete(key)
  if (state.sat !== null) params.set('sat', String(state.sat))
  if (state.owner) params.set('owner', state.owner)
  if (!sameSet(state.hidden, defaults)) params.set('hide', [...state.hidden].sort().join(','))
  if (state.color === 'regime') params.set('color', 'regime')
  if (state.time) params.set('t', `${state.time.toISOString().slice(0, 19)}Z`)
  const text = params.toString()
  return text ? `?${text}` : ''
}
