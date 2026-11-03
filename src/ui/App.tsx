import { useCallback, useEffect, useState } from 'react'
import type { Engine } from '../app/engine'
import { dataFreshness } from '../satellites/data/freshness'
import { ClockPanel } from './ClockPanel'
import { formatInteger, formatSpan } from './format'
import { GlobeCanvas } from './GlobeCanvas'
import { useNow, useStore } from './hooks'
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

export function App() {
  const [engine, setEngine] = useState<Engine | null>(null)
  const [owner, setOwner] = useState('')
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

  return (
    <main className="app">
      <GlobeCanvas onEngine={onEngine} />
      {engine && (
        <>
          <aside className="rail" aria-label="Búsqueda y categorías">
            <Brand engine={engine} />
            <Search engine={engine} owner={owner} />
            <OwnerFilter engine={engine} value={owner} onChange={setOwner} />
            <Legend engine={engine} owner={owner} />
          </aside>
          <SelectionAnnouncer engine={engine} />
          <SelectedCard selected={engine.selected} clock={engine.clock} onClose={() => engine.select(null)} onCenter={engine.focusSelected} />
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
