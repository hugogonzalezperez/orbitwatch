import type { Clock } from '../app/clock'
import { ageBand, epochDistanceDays } from '../satellites/data/freshness'
import type { IssStatus } from '../satellites/createSatellites'
import type { Store } from '../shared/store'
import { formatDecimal, formatLatitude, formatLongitude, formatSpan } from './format'
import { useClockTime, useStore } from './hooks'

const BAND_NOTE = {
  ok: '',
  aging: ' La precisión baja lejos de la época.',
  stale: ' Muy lejos de la época: la posición es poco fiable.',
} as const

export function IssPanel({ iss, clock, onFocus }: { iss: Store<IssStatus>; clock: Clock; onFocus: () => void }) {
  const status = useStore(iss)
  const time = useClockTime(clock)

  if (status.kind === 'loading') {
    return (
      <section className="iss" aria-label="Estado de la ISS">
        <p role="status">Cargando datos de la ISS…</p>
      </section>
    )
  }
  if (status.kind === 'error') {
    return (
      <section className="iss" aria-label="Estado de la ISS">
        <p role="alert" className="note-stale">
          No se pudieron cargar los datos de la ISS ({status.message}). Recarga la página; si sigue igual, los datos
          no están publicados.
        </p>
      </section>
    )
  }

  const distanceDays = epochDistanceDays(status.epoch, time)
  const band = ageBand(distanceDays)
  const spanText = formatSpan(distanceDays * 86_400_000)
  const epochText = distanceDays >= 0 ? `de hace ${spanText}` : `${spanText} posterior a la hora mostrada`

  return (
    <section className="iss" aria-label="Estado de la ISS">
      <div className="iss-head">
        <h2>{status.name}</h2>
        <button type="button" onClick={onFocus}>
          Ver la ISS
        </button>
      </div>
      {status.state ? (
        <p className="iss-position">
          {Math.round(status.state.altKm)} km · {formatLatitude(status.state.latDeg)} {formatLongitude(status.state.lonDeg)} ·{' '}
          {formatDecimal(status.state.speedKmS, 2)} km/s
        </p>
      ) : (
        <p className="note-stale">No se puede calcular la posición a esta hora.</p>
      )}
      <p className={band === 'ok' ? 'iss-age' : `iss-age note-${band}`}>
        Elementos orbitales {epochText}.{BAND_NOTE[band]}
      </p>
    </section>
  )
}
