export type EscapeAction = 'close' | 'clear' | 'pass'

/** Qué hace `Esc` en el buscador: cierra el desplegable, borra lo escrito, o no hace nada y deja que lo use el resto (cerrar la ficha). */
export function escapeAction({ open, query }: { open: boolean; query: string }): EscapeAction {
  if (query.trim() === '') return 'pass'
  return open ? 'close' : 'clear'
}
