import { stepSpeed, type Clock } from '../app/clock'
import { formatSpeed } from './format'
import { useClockState, useClockTime } from './hooks'
import { ForwardIcon, PauseIcon, PlayIcon, RewindIcon } from './icons'

const LOCAL = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
})
const UTC = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export function ClockPanel({ clock }: { clock: Clock }) {
  const state = useClockState(clock)
  const time = useClockTime(clock)
  const mode = state.paused ? 'En pausa' : state.live ? 'En directo' : `Simulación ${formatSpeed(state.speed)}`
  const go = (direction: 1 | -1) => {
    clock.setSpeed(stepSpeed(state.speed, direction))
    clock.resume()
  }

  return (
    <section className="clock" aria-label="Control del tiempo">
      <div className="clock-readout">
        <time className="clock-local" dateTime={time.toISOString()}>
          {LOCAL.format(time)}
        </time>
        <span className="clock-utc">{UTC.format(time)} UTC</span>
      </div>
      <p className="clock-mode" role="status">
        {mode}
      </p>
      <div className="clock-controls">
        <button type="button" onClick={() => go(-1)} aria-label="Retroceder más rápido" title="Retroceder más rápido">
          <RewindIcon />
        </button>
        <button
          type="button"
          onClick={() => (state.paused ? clock.resume() : clock.pause())}
          aria-label={state.paused ? 'Reanudar' : 'Pausar'}
          title={state.paused ? 'Reanudar' : 'Pausar'}
        >
          {state.paused ? <PlayIcon /> : <PauseIcon />}
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Avanzar más rápido" title="Avanzar más rápido">
          <ForwardIcon />
        </button>
        <button type="button" onClick={() => clock.resetToNow()} disabled={state.live}>
          Ahora
        </button>
      </div>
    </section>
  )
}
