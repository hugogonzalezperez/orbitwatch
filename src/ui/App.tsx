import { useState } from 'react'
import type { Engine } from '../app/engine'
import { ClockPanel } from './ClockPanel'
import { GlobeCanvas } from './GlobeCanvas'
import { IssPanel } from './IssPanel'

export function App() {
  const [engine, setEngine] = useState<Engine | null>(null)
  return (
    <>
      <GlobeCanvas onEngine={setEngine} />
      {engine && (
        <div className="hud">
          <ClockPanel clock={engine.clock} />
          <IssPanel iss={engine.iss} clock={engine.clock} onFocus={engine.focusIss} />
        </div>
      )}
      <p className="credits">
        Texturas: <a href="https://www.solarsystemscope.com/textures/">Solar System Scope</a> (CC BY 4.0). Datos orbitales:{' '}
        <a href="https://celestrak.org/">CelesTrak</a>.
      </p>
    </>
  )
}
