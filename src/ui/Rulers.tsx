import { ALTITUDE_MARKS, altitudeRulerPosition } from '../satellites/orbitInfo'
import { formatInteger } from './format'

const percent = (fraction: number): string => `${(fraction * 100).toFixed(2)}%`

/** Regla de altitud: de la superficie a 40 000 km, con marcas en la ISS, el GPS y la órbita geoestacionaria. */
export function AltitudeRuler({ altitudeKm }: { altitudeKm: number }) {
  const marks = ALTITUDE_MARKS.map((m) => `${m.label} ${formatInteger(m.km)} km`).join(', ')
  return (
    <div className="ruler" role="img" aria-label={`Altitud: ${formatInteger(altitudeKm)} km en una regla de 0 a 40 000 km. Referencias: ${marks}.`}>
      <div className="ruler-track">
        {ALTITUDE_MARKS.map((m) => (
          <i key={m.label} className="ruler-tick" style={{ left: percent(altitudeRulerPosition(m.km)) }} />
        ))}
        <i className="ruler-marker" style={{ left: percent(altitudeRulerPosition(altitudeKm)) }} />
      </div>
      <div className="ruler-labels" aria-hidden="true">
        {ALTITUDE_MARKS.map((m) => (
          <span key={m.label} style={{ left: percent(altitudeRulerPosition(m.km)) }} title={`${m.label}: ${formatInteger(m.km)} km`}>
            {m.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Regla de la vuelta: cuatro cuartos marcados y lo recorrido en ámbar. */
export function RevolutionRuler({ fraction }: { fraction: number }) {
  const value = Math.round(fraction * 100)
  return (
    <div className="ruler" role="progressbar" aria-label="Vuelta actual recorrida" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div className="ruler-track">
        <i className="ruler-fill" style={{ width: percent(fraction) }} />
        {[0.25, 0.5, 0.75].map((q) => (
          <i key={q} className="ruler-tick" style={{ left: percent(q) }} />
        ))}
      </div>
    </div>
  )
}
