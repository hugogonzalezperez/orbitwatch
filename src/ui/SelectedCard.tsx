import { useId } from 'react'
import type { Clock } from '../app/clock'
import { getCategory } from '../satellites/categories'
import type { SelectedInfo } from '../satellites/createSatellites'
import { orbitProgress } from '../satellites/propagation/orbit'
import type { Store } from '../shared/store'
import { NBSP, describeRegime, describeSunlight, formatDecimal, formatInteger, formatLatitude, formatLongitude, formatSpan } from './format'
import { useClockTime, useNow, useStore } from './hooks'
import { CloseIcon } from './icons'
import { describeReliability } from './reliability'
import { AltitudeRuler, RevolutionRuler } from './Rulers'

const UTC_DATE = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

interface Props {
  selected: Store<SelectedInfo | null>
  clock: Clock
  onClose: () => void
  onCenter: () => void
}

/** Ficha del satélite seleccionado: qué es, dónde está ahora, cómo es su órbita y cuánto fiarse de los datos. */
export function SelectedCard({ selected, clock, onClose, onCenter }: Props) {
  const info = useStore(selected)
  const simTime = useClockTime(clock)
  const now = useNow()
  const headingId = useId()
  if (!info) return null

  const { state, shape, orbit } = info
  const reliability = describeReliability({ epoch: info.epoch, downloadedAt: info.downloadedAt, simTime, now })
  const progress = orbit ? orbitProgress(orbit, simTime) : null
  const period = formatSpan(shape.periodMinutes * 60_000)

  return (
    <aside className="card" aria-labelledby={headingId}>
      <header className="card-head">
        <div>
          <h2 id={headingId} className="card-name" translate="no">
            {info.name}
          </h2>
          <p className="card-kind">
            {getCategory(info.category).kind} · {describeRegime(shape.regime)}
          </p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar la ficha" title="Cerrar (Esc)">
          <CloseIcon />
        </button>
      </header>

      {state ? (
        <section className="card-section" aria-label="Posición ahora">
          <p className="card-where">
            Sobre <span className="num">{formatLatitude(state.latDeg)}</span>, <span className="num">{formatLongitude(state.lonDeg)}</span>
          </p>
          <p className="card-sun">{describeSunlight(state.sunlight)}</p>
          <dl className="figures">
            <div>
              <dt>Altitud</dt>
              <dd className="num">
                {formatInteger(state.altKm)}{NBSP}<span className="unit">km</span>
              </dd>
            </div>
            <div>
              <dt>Velocidad</dt>
              <dd className="num">
                {formatDecimal(state.speedKmS, 2)}{NBSP}<span className="unit">km/s</span>
              </dd>
            </div>
          </dl>
          <AltitudeRuler altitudeKm={state.altKm} />
        </section>
      ) : (
        <p className="note-stale" role="alert">
          No se puede calcular la posición a esta hora.
        </p>
      )}

      <section className="card-section" aria-label="Órbita">
        <h3>{shape.regime === 'geosynchronous' ? 'Un giro cada día' : `Una vuelta cada ${period}`}</h3>
        {progress && (
          <>
            <RevolutionRuler fraction={progress.fraction} />
            <p className="num">
              {Math.round(progress.fraction * 100)} % de la vuelta · quedan {formatSpan(progress.remainingMs)}
            </p>
          </>
        )}
        <dl className="facts">
          <div>
            <dt>Perigeo</dt>
            <dd className="num">{formatInteger(shape.perigeeKm)}{NBSP}km</dd>
          </div>
          <div>
            <dt>Apogeo</dt>
            <dd className="num">{formatInteger(shape.apogeeKm)}{NBSP}km</dd>
          </div>
          <div>
            <dt>Inclinación</dt>
            <dd className="num">{formatDecimal(shape.inclinationDeg, 1)}°</dd>
          </div>
        </dl>
      </section>

      <section className="card-section" aria-label="Fiabilidad de los datos">
        <p className={reliability.band === 'ok' ? 'reliability' : `reliability note-${reliability.band}`}>{reliability.summary}</p>
        <details>
          <summary>Ver el detalle</summary>
          <dl className="detail">
            <dt>Elementos orbitales</dt>
            <dd className="num">
              {UTC_DATE.format(info.epoch)} UTC, {reliability.epochAge}
            </dd>
            <dt>Descargados de CelesTrak</dt>
            <dd className="num">
              {UTC_DATE.format(info.downloadedAt)} UTC, {reliability.downloadAge}
            </dd>
          </dl>
        </details>
      </section>

      <footer className="card-foot">
        <p className="ids num">
          NORAD {info.id} · {info.designator}
        </p>
        <button type="button" className="primary" onClick={onCenter}>
          Centrar en pantalla
        </button>
      </footer>
    </aside>
  )
}
