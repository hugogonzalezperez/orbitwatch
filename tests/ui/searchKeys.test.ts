import { describe, expect, it } from 'vitest'
import { escapeAction } from '../../src/ui/searchKeys'

describe('escapeAction', () => {
  it('con el desplegable abierto y texto escrito, Esc lo cierra primero', () => {
    expect(escapeAction({ open: true, query: 'noaa' })).toBe('close')
  })

  it('con el desplegable cerrado y texto escrito, Esc borra el texto', () => {
    expect(escapeAction({ open: false, query: 'noaa' })).toBe('clear')
  })

  it('con solo espacios escritos cuenta como vacío', () => {
    expect(escapeAction({ open: true, query: '   ' })).toBe('pass')
  })

  it('con el campo vacío, Esc no se gasta aquí: pasa al resto de la interfaz (cerrar la ficha)', () => {
    expect(escapeAction({ open: true, query: '' })).toBe('pass')
    expect(escapeAction({ open: false, query: '' })).toBe('pass')
  })
})
