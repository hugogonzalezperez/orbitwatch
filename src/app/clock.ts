export interface ClockState {
  /** Segundos simulados por segundo real. Negativa: el tiempo retrocede. */
  speed: number
  paused: boolean
  /** Hora simulada = hora real del equipo, corriendo a 1x. */
  live: boolean
}

export interface Clock {
  time(): Date
  state(): ClockState
  setSpeed(speed: number): void
  pause(): void
  resume(): void
  jumpTo(date: Date): void
  /** Vuelve a la hora del equipo, a velocidad 1 y sin pausa. */
  resetToNow(): void
  /** Avisa de cambios de estado, no del paso del tiempo. Devuelve la baja. */
  subscribe(listener: () => void): () => void
}

const LIVE_TOLERANCE_MS = 1000

export function createClock({
  now = Date.now,
  start,
  paused: startPaused = false,
}: { now?: () => number; start?: Date; paused?: boolean } = {}): Clock {
  let anchorSim = start?.getTime() ?? now()
  let anchorReal = now()
  let speed = 1
  let paused = startPaused
  const listeners = new Set<() => void>()

  // Todo cambio parte de la hora simulada actual, así que cambiar de velocidad no da saltos.
  const simNow = () => (paused ? anchorSim : anchorSim + (now() - anchorReal) * speed)
  // `live` solo cambia con el estado: a 1x la hora simulada y la real avanzan juntas. Por eso el objeto se puede cachear.
  const snapshot = (): ClockState => ({
    speed,
    paused,
    live: !paused && speed === 1 && Math.abs(simNow() - now()) <= LIVE_TOLERANCE_MS,
  })
  let current = snapshot()
  const rebase = (sim: number) => {
    anchorSim = sim
    anchorReal = now()
    current = snapshot()
    listeners.forEach((listener) => listener())
  }

  return {
    time: () => new Date(simNow()),
    state: () => current,
    setSpeed(next) {
      const sim = simNow()
      speed = next
      rebase(sim)
    },
    pause() {
      const sim = simNow()
      paused = true
      rebase(sim)
    },
    resume() {
      paused = false
      rebase(anchorSim)
    },
    jumpTo: (date) => rebase(date.getTime()),
    resetToNow() {
      speed = 1
      paused = false
      rebase(now())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}

// Escala de velocidades de los botones de avance y retroceso rápido.
const SPEED_LADDER = [-86_400, -3_600, -600, -60, -10, -1, 1, 10, 60, 600, 3_600, 86_400]

/** Siguiente velocidad de la escala en la dirección pedida; se queda en el extremo. */
export function stepSpeed(speed: number, direction: 1 | -1): number {
  const next =
    direction === 1 ? SPEED_LADDER.find((s) => s > speed) : [...SPEED_LADDER].reverse().find((s) => s < speed)
  return next ?? SPEED_LADDER[direction === 1 ? SPEED_LADDER.length - 1 : 0]!
}

/** Cada cuánto hay que redibujar mientras el tiempo corre: 0 = en cada fotograma. */
export const animationIntervalMs = (speed: number): number => (Math.abs(speed) <= 1 ? 1000 : 0)
