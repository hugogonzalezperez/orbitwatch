import type { Ref } from 'react'
import type { Clock } from '../app/clock'
import type { IssStatus } from '../satellites/createSatellites'
import { ageBand, epochDistanceDays, type AgeBand } from '../satellites/data/freshness'
import { dataFreshness } from '../satellites/data/manifest'
import { orbitProgress } from '../satellites/propagation/orbit'
import type { Store } from '../shared/store'
import {
  describeSunlight,
  describeTimeOffset,
  formatDecimal,
  formatInteger,
  formatLatitude,
  formatLongitude,
  formatSpan,
} from './format'
import { useClockState, useClockTime, useStore } from './hooks'
import { CloseIcon } from './icons'

const UTC_DATE = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const EPOCH_NOTE: Record<AgeBand, string> = {
  ok: '',
  aging: 'La precisión baja lejos de la época.',
  stale: 'Muy lejos de la época: la posición es poco fiable.',
}
const DOWNLOAD_NOTE: Record<AgeBand, string> = {
  ok: '',
  aging: 'Puede que CelesTrak ya tenga datos más recientes.',
  stale: 'Desactualizados: CelesTrak tiene datos más recientes.',
}

interface Props {
  ref: Ref<HTMLElement>
  iss: Store<IssStatus>
  clock: Clock
  onClose: () => void
  onCenter: () => void
}

/** Panel lateral con los datos de la ISS; se abre al pulsar sobre ella. */
export function IssPanel({ ref, iss, clock, onClose, onCenter }: Props) {
  const status = useStore(iss)
  const clockState = useClockState(clock)
  const simTime = useClockTime(clock)
  const realNow = Date.now()

  return (
    <aside className="side" id="iss-panel" aria-label="Información de la ISS" tabIndex={-1} ref={ref}>
      <header className="side-head">
        <div>
          <h2>{status.kind === 'ready' ? status.name : 'ISS'}</h2>
          {status.kind === 'ready' && (
            <p className="dim">
              NORAD {status.noradId} · {status.designator}
            </p>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar panel" title="Cerrar (Esc)">
          <CloseIcon />
        </button>
      </header>

      {status.kind === 'loading' && <p role="status">Cargando datos de la ISS…</p>}
      {status.kind === 'error' && (
        <p role="alert" className="note-stale">
          No se pudieron cargar los datos de la ISS ({status.message}). Recarga la página; si sigue igual, los datos no
          están publicados.
        </p>
      )}
      {status.kind === 'ready' && (
        <>
          {status.state ? (
            <dl className="metrics">
              <div>
                <dt>Latitud</dt>
                <dd>{formatLatitude(status.state.latDeg)}</dd>
              </div>
              <div>
                <dt>Longitud</dt>
                <dd>{formatLongitude(status.state.lonDeg)}</dd>
              </div>
              <div>
                <dt>Altitud</dt>
                <dd>{formatInteger(status.state.altKm)} km</dd>
              </div>
              <div>
                <dt>Velocidad</dt>
                <dd>
                  {formatDecimal(status.state.speedKmS, 2)} km/s
                  <span className="dim"> {formatInteger(status.state.speedKmS * 3600)} km/h</span>
                </dd>
              </div>
              <div className="wide">
                <dt>Iluminación</dt>
                <dd>{describeSunlight(status.state.sunlight)}</dd>
              </div>
            </dl>
          ) : (
            <p className="note-stale">No se puede calcular la posición a esta hora.</p>
          )}

          <section aria-label="Hora">
            <h3>Hora</h3>
            <p className={clockState.live ? 'value accent' : 'value'}>
              {describeTimeOffset(simTime.getTime(), realNow)}
              {clockState.paused && !clockState.live ? ' · en pausa' : ''}
            </p>
          </section>

          <section aria-label="Datos">
            <h3>Datos</h3>
            <EpochRow epoch={status.epoch} simTime={simTime} />
            <DownloadRow downloadedAt={status.downloadedAt} now={new Date(realNow)} />
          </section>

          <section aria-label="Órbita actual">
            <h3>Órbita actual</h3>
            {status.orbit ? <OrbitRow orbit={status.orbit} simTime={simTime} /> : <p className="dim">No se puede calcular la órbita.</p>}
          </section>
        </>
      )}

      <footer>
        <button type="button" onClick={onCenter}>
          Ver la ISS y su órbita
        </button>
      </footer>
    </aside>
  )
}

/** Una fila de «Datos»: etiqueta, valor y, si envejece, un aviso con su color. */
function DataRow({ label, value, band, note }: { label: string; value: string; band: AgeBand; note: string }) {
  return (
    <p className="row">
      <span className="dim">{label}</span>
      <span>{value}</span>
      {band !== 'ok' && <span className={`note-${band}`}>{note}</span>}
    </p>
  )
}

function EpochRow({ epoch, simTime }: { epoch: Date; simTime: Date }) {
  const days = epochDistanceDays(epoch, simTime)
  const span = formatSpan(days * 86_400_000)
  const when = days >= 0 ? `hace ${span}` : `${span} después de la hora mostrada`
  const band = ageBand(days)
  return <DataRow label="Elementos orbitales (época)" value={`${UTC_DATE.format(epoch)} UTC · ${when}`} band={band} note={EPOCH_NOTE[band]} />
}

function DownloadRow({ downloadedAt, now }: { downloadedAt: Date | null; now: Date }) {
  if (!downloadedAt) return <DataRow label="Descargados de CelesTrak" value="Fecha desconocida" band="ok" note="" />
  const band = dataFreshness(downloadedAt, now)
  const value = `${UTC_DATE.format(downloadedAt)} UTC · hace ${formatSpan(now.getTime() - downloadedAt.getTime())}`
  return <DataRow label="Descargados de CelesTrak" value={value} band={band} note={DOWNLOAD_NOTE[band]} />
}

function OrbitRow({ orbit, simTime }: { orbit: { start: Date; end: Date }; simTime: Date }) {
  const { fraction, remainingMs } = orbitProgress(orbit, simTime)
  const percent = Math.round(fraction * 100)
  return (
    <>
      <div className="progress" role="progressbar" aria-label="Vuelta actual recorrida" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="value">
        {percent} % recorrido · quedan {formatSpan(remainingMs)}
      </p>
      <p className="legend">
        <span>
          <i className="swatch" aria-hidden="true" /> Ya recorrido
        </span>
        <span>
          <i className="swatch swatch-dashed" aria-hidden="true" /> Por recorrer
        </span>
      </p>
    </>
  )
}
