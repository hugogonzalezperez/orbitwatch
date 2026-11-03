import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { CatalogEntry } from '../satellites/catalog'
import { visibleRange } from './virtual'

/** Alto de cada fila en píxeles; el CSS usa el mismo valor (`.vlist-row`). */
const ROW_HEIGHT = 44
const MAX_HEIGHT = 308
const OVERSCAN_ROWS = 6

interface Props {
  id: string
  label: string
  entries: CatalogEntry[]
  selectedId: number | null
  onSelect: (id: number) => void
}

/** Lista de satélites con ventana virtual: Starlink son 11 000 filas y solo se pintan las que se ven. */
export function VirtualList({ id, label, entries, selectedId, onSelect }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const height = Math.min(entries.length * ROW_HEIGHT, MAX_HEIGHT)

  // Si el elegido está en la lista y queda fuera de la vista, se centra.
  useLayoutEffect(() => {
    const index = selectedId === null ? -1 : entries.findIndex((e) => e.id === selectedId)
    if (index === -1) return
    const element = scroller.current!
    const top = index * ROW_HEIGHT
    if (top >= element.scrollTop && top + ROW_HEIGHT <= element.scrollTop + height) return
    element.scrollTop = Math.max(0, top - (height - ROW_HEIGHT) / 2)
    setScrollTop(element.scrollTop)
  }, [entries, selectedId, height])

  const { start, end } = visibleRange(scrollTop, height, ROW_HEIGHT, entries.length, OVERSCAN_ROWS)

  // Las flechas mueven el foco entre las filas pintadas; el navegador desplaza la lista y pinta las siguientes.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
    const next = buttons.indexOf(document.activeElement as HTMLButtonElement) + (event.key === 'ArrowDown' ? 1 : -1)
    buttons[Math.min(buttons.length - 1, Math.max(0, next))]?.focus()
    event.preventDefault()
  }

  return (
    <div id={id} ref={scroller} className="vlist" style={{ height }} role="group" aria-label={label} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)} onKeyDown={onKeyDown}>
      <div className="vlist-spacer" style={{ height: entries.length * ROW_HEIGHT }}>
        {entries.slice(start, end).map((entry, i) => (
          <div key={entry.id} className="vlist-row" style={{ top: (start + i) * ROW_HEIGHT }}>
            <button type="button" className="legend-sat" aria-current={entry.id === selectedId} onClick={() => onSelect(entry.id)}>
              <span className="result-name" translate="no">{entry.name}</span>
              <span className="result-id num">{entry.id}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
