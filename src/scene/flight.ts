import { Quaternion, Vector3 } from 'three'

interface Flight {
  /** Posición de la cámara `elapsedMs` después de salir. */
  position(elapsedMs: number): Vector3
  finished(elapsedMs: number): boolean
}

// Sale rápido y frena al llegar: la cámara responde al instante a la pulsación y se posa sin golpe.
const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))

/** Vuelo de la cámara de `from` a `to` alrededor del centro: la dirección gira por el camino corto y la distancia se interpola en escala logarítmica. */
export function createFlight(from: Vector3, to: Vector3, durationMs: number): Flight {
  const fromRadius = from.length()
  const toRadius = to.length()
  const fromDirection = from.clone().normalize()
  const rotation = new Quaternion().setFromUnitVectors(fromDirection, to.clone().normalize())
  const step = new Quaternion()
  const result = new Vector3()
  return {
    position(elapsedMs) {
      const eased = durationMs <= 0 ? 1 : easeOutExpo(Math.min(1, Math.max(0, elapsedMs / durationMs)))
      step.identity().slerp(rotation, eased)
      const radius = fromRadius * (toRadius / fromRadius) ** eased
      return result.copy(fromDirection).applyQuaternion(step).multiplyScalar(radius)
    },
    finished: (elapsedMs) => elapsedMs >= durationMs,
  }
}
