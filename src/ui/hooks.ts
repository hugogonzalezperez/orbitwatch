import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Clock } from '../app/clock'
import type { Store } from '../shared/store'

export const useStore = <T,>(store: Store<T>): T => useSyncExternalStore(store.subscribe, store.get)

export const useClockState = (clock: Clock) => useSyncExternalStore(clock.subscribe, clock.state)

/** Hora simulada para pintarla: se refresca 4 veces por segundo y al cambiar el estado del reloj. */
export function useClockTime(clock: Clock, intervalMs = 250): Date {
  const [time, setTime] = useState(() => clock.time())
  useEffect(() => {
    const tick = () => setTime(clock.time())
    tick()
    const id = setInterval(tick, intervalMs)
    const unsubscribe = clock.subscribe(tick)
    return () => {
      clearInterval(id)
      unsubscribe()
    }
  }, [clock, intervalMs])
  return time
}
