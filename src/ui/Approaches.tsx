import { useId, useState } from 'react'
import type { Engine } from '../app/engine'
import type { Approach } from '../satellites/createSatellites'
import { NBSP, formatDecimal } from './format'

const THRESHOLD_KM = 10
const LIMIT = 10

/** Busca los pares de objetos que ahora mismo están a menos de 10 km. Es una instantánea con datos públicos, no una predicción. */
export function Approaches({ engine }: { engine: Engine }) {
  const [found, setFound] = useState<Approach[] | null>(null)
  const id = useId()
  return (
    <details className="approaches">
      <summary>Acercamientos ahora</summary>
      <div id={id} className="approaches-body">
        <p className="approaches-note">
          Pares a menos de {THRESHOLD_KM}{NBSP}km a la hora mostrada, entre lo que se ve (sin los acoplados ni los del mismo lanzamiento). Los elementos orbitales públicos tienen errores de kilómetros: sirve para
          encontrar candidatos, no para predecir colisiones.
        </p>
        <button type="button" className="outline" onClick={() => setFound(engine.approaches(THRESHOLD_KM, LIMIT))}>
          {found ? 'Buscar de nuevo' : 'Buscar acercamientos'}
        </button>
        {found && found.length === 0 && <p className="approaches-note">No hay ningún par a esa distancia entre los visibles.</p>}
        {found && found.length > 0 && (
          <ol className="approaches-list" aria-label="Acercamientos encontrados">
            {found.map(({ a, b, distanceKm }) => (
              <li key={`${a.id}-${b.id}`}>
                <button type="button" onClick={() => engine.select(a.id, { center: true })} title={`Ver ${a.name}`}>
                  <span className="approach-names" translate="no">
                    {a.name} · {b.name}
                  </span>
                  <span className="num approach-km">
                    {formatDecimal(distanceKm, 1)}{NBSP}km
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </details>
  )
}
