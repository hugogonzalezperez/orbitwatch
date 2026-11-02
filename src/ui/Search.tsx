import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import type { Engine } from '../app/engine'
import { rankResults, searchEntries } from '../satellites/catalog'
import { getCategory } from '../satellites/categories'
import { useStore } from './hooks'

const MAX_RESULTS = 8
const cssColor = (hex: number): string => `#${hex.toString(16).padStart(6, '0')}`

/** Buscador con desplegable: se abre al escribir, se maneja con el teclado y se enfoca con «/». */
export function Search({ engine }: { engine: Engine }) {
  const data = useStore(engine.data)
  const catalog = data.kind === 'ready' ? data.catalog : null
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const deferred = useDeferredValue(query)
  const searching = deferred.trim() !== ''

  const results = useMemo(() => (catalog ? rankResults(catalog, deferred, MAX_RESULTS) : []), [catalog, deferred])
  const matches = useMemo(() => (catalog && searching ? searchEntries(catalog, deferred) : []), [catalog, deferred, searching])

  // El globo atenúa lo que no coincide con lo escrito. (`matches` está vacío si no se busca nada.)
  useEffect(() => engine.setHighlight(matches.length > 0 ? new Set(matches.map((e) => e.id)) : null), [engine, matches]) // sin coincidencias no se atenúa nada: parecería que el globo se vacía
  useEffect(() => () => engine.setHighlight(null), [engine])

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key !== '/' || target.closest('input, textarea, [contenteditable]')) return
      event.preventDefault()
      input.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const choose = (id: number) => {
    engine.select(id, { center: true })
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (results.length === 0) return
      event.preventDefault()
      setOpen(true)
      setActive((current) => (current + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length)
    } else if (event.key === 'Enter') {
      const entry = results[active]
      if (open && entry) {
        event.preventDefault()
        choose(entry.id)
      }
    } else if (event.key === 'Escape' && (open || query)) {
      event.preventDefault() // el Esc global no debe deseleccionar además
      if (open && query) setOpen(false)
      else setQuery('')
    }
  }

  const expanded = open && searching
  return (
    <div className="search">
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && results[active] ? `${listId}-${results[active].id}` : undefined}
        aria-label="Buscar satélite por nombre o número NORAD"
        placeholder={catalog || data.kind === 'error' ? 'Buscar satélite' : 'Cargando satélites…'}
        disabled={!catalog}
        value={query}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {!query && catalog && <kbd className="search-hint" aria-hidden="true">/</kbd>}
      <ul id={listId} role="listbox" aria-label="Resultados" className="results" hidden={!expanded}>
        {results.map((entry, index) => (
          <li
            key={entry.id}
            id={`${listId}-${entry.id}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(event) => event.preventDefault()} // mantiene el foco en el campo hasta elegir
            onClick={() => choose(entry.id)}
            onMouseEnter={() => setActive(index)}
          >
            <i className="swatch" style={{ '--swatch': cssColor(getCategory(entry.category).color) } as CSSProperties} aria-hidden="true" />
            <span className="result-name">{entry.name}</span>
            <span className="result-id num">{entry.id}</span>
          </li>
        ))}
        {expanded && results.length === 0 && (
          <li role="presentation" className="results-empty">
            Ningún satélite coincide con «{query.trim()}».
          </li>
        )}
      </ul>
      <p className="sr-only" role="status">
        {expanded ? (results.length === 0 ? 'Sin resultados' : `${matches.length} resultados`) : ''}
      </p>
    </div>
  )
}
