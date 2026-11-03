import { describe, expect, it } from 'vitest'
import { readShareState, writeShareState } from '../../src/app/urlState'

const defaults = new Set(['debris'])
const read = (search: string) => readShareState(search, defaults)

describe('readShareState', () => {
  it('sin parámetros devuelve el estado por defecto', () => {
    expect(read('')).toEqual({ sat: null, owner: '', hidden: defaults, color: 'category', time: null })
  })

  it('lee satélite, propietario, categorías ocultas y hora', () => {
    const state = read('?sat=25544&owner=US&hide=starlink,debris&color=regime&t=2026-03-20T14:46:00Z')
    expect(state.sat).toBe(25544)
    expect(state.owner).toBe('US')
    expect(state.color).toBe('regime')
    expect([...state.hidden].sort()).toEqual(['debris', 'starlink'])
    expect(state.time?.toISOString()).toBe('2026-03-20T14:46:00.000Z')
  })

  it('un `hide` vacío es «no ocultar nada», distinto de no tener `hide`', () => {
    expect(read('?hide=').hidden.size).toBe(0)
  })

  it.each(['?sat=abc', '?sat=-5', '?sat=1.5', '?sat=0', '?sat='])('ignora el satélite %s', (search) => {
    expect(read(search).sat).toBeNull()
  })

  it('ignora lo que no tiene forma de código de propietario o de categoría, o de fecha', () => {
    const state = read('?owner=<script>&hide=a b,../x,ok-1&t=ayer')
    expect(state.owner).toBe('')
    expect([...state.hidden]).toEqual(['ok-1'])
    expect(state.time).toBeNull()
  })
})

describe('writeShareState', () => {
  const base = { sat: null, owner: '', hidden: defaults, color: 'category' as const, time: null }

  it('el estado por defecto no añade nada', () => {
    expect(writeShareState('', base, defaults)).toBe('')
  })

  it('escribe solo lo que se aparta de lo habitual, y ordena las categorías', () => {
    const search = writeShareState('', { sat: 25544, owner: 'US', hidden: new Set(['weather', 'debris']), color: 'regime', time: new Date('2026-03-20T14:46:00Z') }, defaults)
    expect(search).toBe('?sat=25544&owner=US&hide=debris%2Cweather&color=regime&t=2026-03-20T14%3A46%3A00Z')
  })

  it('mostrar todo se escribe como `hide=` vacío', () => {
    expect(writeShareState('', { ...base, hidden: new Set() }, defaults)).toBe('?hide=')
  })

  it('conserva los otros parámetros (?perf) y quita los que ya no hacen falta', () => {
    expect(writeShareState('?perf&sat=1&owner=US', base, defaults)).toBe('?perf=')
  })

  it('se lee de vuelta tal cual', () => {
    const state = { sat: 7, owner: 'PRC', hidden: new Set(['starlink']), color: 'regime' as const, time: new Date('2026-01-02T03:04:05Z') }
    expect(read(writeShareState('', state, defaults))).toEqual(state)
  })
})
