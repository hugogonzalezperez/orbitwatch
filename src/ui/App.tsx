import { useCallback, useEffect, useState } from 'react'
import type { Engine } from '../app/engine'
import { readShareState, writeShareState } from '../app/urlState'
import { dataFreshness } from '../satellites/data/freshness'
import type { DataStatus } from '../satellites/createSatellites'
import { createStore } from '../shared/store'
import { DEFAULT_HIDDEN } from './filters'
import { ClockPanel } from './ClockPanel'
import { formatInteger, formatSpan } from './format'
import { GlobeCanvas } from './GlobeCanvas'
import { useNow, useStore } from './hooks'
import { ColorMode } from './ColorMode'
import { Hint } from './Hint'
import { Legend } from './Legend'
import { OwnerFilter } from './OwnerFilter'
import { Search } from './Search'
import { SelectedCard } from './SelectedCard'

/** Nombre del producto y, debajo, qué se está viendo y cuánto se puede fiar uno de ello. */
function Brand({ engine }: { engine: Engine }) {
  const data = useStore(engine.data)
  const now = useNow()
  let line = ''
  let band: 'ok' | 'aging' | 'stale' = 'ok'
  if (data.kind === 'ready') {
    band = dataFreshness(data.downloadedAt, now)
    const age = formatSpan(now.getTime() - data.downloadedAt.getTime())
    line = `${formatInteger(data.catalog.length)} objetos · datos de hace ${age}${band === 'stale' ? ' (desactualizados)' : ''}`
  }
  return (
    <header className="brand">
      <h1 translate="no">OrbitWatch</h1>
      <p className={band === 'ok' ? 'brand-line' : `brand-line note-${band}`}>{line}</p>
    </header>
  )
}

/** Anuncia a los lectores de pantalla qué satélite se ha elegido: la ficha aparece sin que nada lo diga. */
function SelectionAnnouncer({ engine }: { engine: Engine }) {
  const selected = useStore(engine.selected)
  return (
    <p className="sr-only" role="status">
      {selected ? `Seleccionado: ${selected.name}` : ''}
    </p>
  )
}

const NO_SELECTION = createStore<number | null>(null)
const LOADING = createStore<DataStatus>({ kind: 'loading' })

export function App() {
  const [engine, setEngine] = useState<Engine | null>(null)
  const [owner, setOwner] = useState(() => readShareState(window.location.search, DEFAULT_HIDDEN).owner)
  const [hidden, setHidden] = useState(() => readShareState(window.location.search, DEFAULT_HIDDEN).hidden)
  const [filtersOpen, setFiltersOpen] = useState(false) // solo cuenta en pantallas estrechas: en las anchas los filtros se ven siempre
  const [color, setColor] = useState(() => readShareState(window.location.search, DEFAULT_HIDDEN).color)
  const toggleCategory = useCallback(
    (id: string) =>
      setHidden((current) => {
        const next = new Set(current)
        if (!next.delete(id)) next.add(id)
        return next
      }),
    [],
  )
  const onEngine = useCallback((next: Engine | null) => setEngine(next), [])

  // Esc cierra la ficha, salvo que el buscador lo haya usado ya (para cerrar su desplegable o borrar lo escrito).
  useEffect(() => {
    if (!engine) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) engine.select(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [engine])

  useEffect(() => engine?.setHiddenCategories(hidden), [engine, hidden])
  useEffect(() => engine?.setColorMode(color), [engine, color])

  // La dirección refleja lo que se ve (satélite, país, categorías), para poder compartirla; la hora la añade «Copiar enlace».
  const selection = useStore(engine?.selection ?? NO_SELECTION)
  useEffect(() => setFiltersOpen(false), [selection]) // al elegir un satélite, la ficha ocupa el sitio
  const ready = useStore(engine?.data ?? LOADING).kind === 'ready' // antes de cargar no hay selección: escribir ahora borraría el `sat` del enlace
  useEffect(() => {
    if (!ready) return
    const search = writeShareState(window.location.search, { sat: selection, owner, hidden, color, time: null }, DEFAULT_HIDDEN)
    window.history.replaceState(null, '', `${window.location.pathname}${search}${window.location.hash}`)
  }, [ready, selection, owner, hidden, color])

  return (
    <main className="app">
      <GlobeCanvas onEngine={onEngine} />
      {engine && (
        <>
          <aside className="rail" aria-label="Búsqueda y categorías">
            <Brand engine={engine} />
            <Search engine={engine} owner={owner} />
            <button type="button" className="outline rail-toggle" aria-expanded={filtersOpen} aria-controls="rail-filters" onClick={() => setFiltersOpen(!filtersOpen)}>
              Filtros y categorías
            </button>
            <div id="rail-filters" className="rail-filters" data-open={filtersOpen}>
              <OwnerFilter engine={engine} value={owner} onChange={setOwner} />
              <ColorMode value={color} onChange={setColor} />
              <Legend engine={engine} owner={owner} hidden={hidden} colorMode={color} onToggle={toggleCategory} />
            </div>
          </aside>
          <SelectionAnnouncer engine={engine} />
          <SelectedCard selected={engine.selected} clock={engine.clock} following={engine.following} onFollow={engine.setFollowing} onClose={() => engine.select(null)} onCenter={engine.focusSelected} />
          <Hint />
          <div className="dock">
            <ClockPanel clock={engine.clock} />
          </div>
        </>
      )}
      <p className="credits">
        Texturas: <a href="https://www.solarsystemscope.com/textures/">Solar System Scope</a> (CC BY 4.0). Datos orbitales:{' '}
        <a href="https://celestrak.org/">CelesTrak</a>.
      </p>
    </main>
  )
}
