import { useId, useMemo, useState, type CSSProperties } from 'react'
import type { Engine } from '../app/engine'
import { filterByOwner, groupByCategory, type CatalogEntry } from '../satellites/catalog'
import type { Category } from '../satellites/categories'
import type { ColorMode } from '../satellites/regimes'
import { cssColor, formatInteger } from './format'
import { useStore } from './hooks'
import { ChevronRightIcon } from './icons'
import { VirtualList } from './VirtualList'

const NEUTRAL = '#6b7280'

/** Leyenda del globo: qué son los puntos, cuántos hay de cada tipo, y un interruptor para mostrarlos u ocultarlos. */
export function Legend({ engine, owner, hidden, colorMode, onToggle }: { engine: Engine; owner: string; hidden: ReadonlySet<string>; colorMode: ColorMode; onToggle: (categoryId: string) => void }) {
  const data = useStore(engine.data)
  const selectedId = useStore(engine.selection)
  const groups = useMemo(() => (data.kind === 'ready' ? groupByCategory(filterByOwner(data.catalog, owner)) : []), [data, owner])
  const [openId, setOpenId] = useState<string | null>(null)

  if (data.kind === 'loading') return <p className="rail-note" role="status">Cargando satélites…</p>
  if (data.kind === 'error') {
    return (
      <p className="rail-note note-stale" role="alert">
        No se pudieron cargar los datos ({data.message}). Recarga la página; si sigue igual, los datos no están publicados.
      </p>
    )
  }

  return (
    <ul className="legend" aria-label="Categorías de satélites">
      {groups.map(({ category, entries }) => (
        <LegendItem
          key={category.id}
          category={category}
          entries={entries}
          visible={!hidden.has(category.id)}
          neutral={colorMode === 'regime'}
          open={openId === category.id}
          selectedId={selectedId}
          onToggle={() => onToggle(category.id)}
          onOpen={() => setOpenId(openId === category.id ? null : category.id)}
          onSelect={(id) => engine.select(id, { center: true })}
        />
      ))}
    </ul>
  )
}

interface ItemProps {
  category: Category
  entries: CatalogEntry[]
  visible: boolean
  /** Al colorear por órbita, el color de la categoría no vale: la muestra se queda gris. */
  neutral: boolean
  open: boolean
  selectedId: number | null
  onToggle: () => void
  onOpen: () => void
  onSelect: (id: number) => void
}

function LegendItem({ category, entries, visible, neutral, open, selectedId, onToggle, onOpen, onSelect }: ItemProps) {
  const listId = useId()
  return (
    <li className="legend-item">
      <div className="legend-row">
        <button type="button" className="legend-toggle" aria-pressed={visible} aria-label={`Mostrar ${category.label} en el globo`} onClick={onToggle}>
          <i className={visible ? 'swatch' : 'swatch swatch-off'} style={{ '--swatch': neutral ? NEUTRAL : cssColor(category.color) } as CSSProperties} aria-hidden="true" />
          <span className="legend-label">{category.label}</span>
          <span className="legend-count num">{formatInteger(entries.length)}</span>
        </button>
        <button
          type="button"
          className="icon-button legend-expand"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`Ver la lista de ${category.label}`}
          onClick={onOpen}
        >
          <span className="chevron" aria-hidden="true">
            <ChevronRightIcon />
          </span>
        </button>
      </div>
      {open && <VirtualList id={listId} label={`Lista de ${category.label}`} entries={entries} selectedId={selectedId} onSelect={onSelect} />}
    </li>
  )
}
