/** Filas de altura fija que hay que pintar para una ventana de desplazamiento, con `overscan` filas de margen a cada lado. */
export function visibleRange(scrollTop: number, viewportHeight: number, rowHeight: number, rowCount: number, overscan: number) {
  const first = Math.floor(scrollTop / rowHeight)
  const last = Math.ceil((scrollTop + viewportHeight) / rowHeight) // la fila que asoma a medias cuenta
  const end = Math.min(rowCount, last + overscan)
  return { start: Math.min(Math.max(0, first - overscan), end), end }
}
