import { useCallback, useEffect, useRef, useState } from 'react'
import type { Engine } from '../app/engine'
import { ClockPanel } from './ClockPanel'
import { GlobeCanvas } from './GlobeCanvas'
import { useStore } from './hooks'
import { ChevronLeftIcon } from './icons'
import { IssPanel } from './IssPanel'

function SidePanels({ engine }: { engine: Engine }) {
  const open = useStore(engine.selection) === 'iss'
  const panelRef = useRef<HTMLElement>(null)
  const tabRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)

  // Al abrir, el foco pasa al panel (el teclado entra en él y Escape lo cierra); al cerrarlo con el botón o con
  // Escape, vuelve a la pestaña que lo abre. Si se cierra pulsando en el globo, no se mueve.
  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true })
    else if (returnFocus.current) tabRef.current?.focus()
    returnFocus.current = false
  }, [open])
  const close = useCallback(() => {
    returnFocus.current = true
    engine.select(null)
  }, [engine])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  if (!open) {
    return (
      <button type="button" className="side-tab" ref={tabRef} aria-controls="iss-panel" aria-expanded={false} onClick={() => engine.select('iss')}>
        <ChevronLeftIcon /> ISS
      </button>
    )
  }
  return (
    <IssPanel
      ref={panelRef}
      iss={engine.iss}
      clock={engine.clock}
      onClose={close}
      onCenter={engine.focusIss}
    />
  )
}

export function App() {
  const [engine, setEngine] = useState<Engine | null>(null)
  const onEngine = useCallback((next: Engine | null) => setEngine(next), [])
  return (
    <>
      <GlobeCanvas onEngine={onEngine} />
      {engine && (
        <>
          <div className="hud">
            <ClockPanel clock={engine.clock} />
          </div>
          <SidePanels engine={engine} />
        </>
      )}
      <p className="credits">
        Texturas: <a href="https://www.solarsystemscope.com/textures/">Solar System Scope</a> (CC BY 4.0). Datos orbitales:{' '}
        <a href="https://celestrak.org/">CelesTrak</a>.
      </p>
    </>
  )
}
