export interface Store<T> {
  get(): T
  set(value: T): void
  subscribe(listener: () => void): () => void
}

/** Valor observable mínimo: puente entre el motor 3D y React (`useSyncExternalStore`). */
export function createStore<T>(initial: T): Store<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return
      value = next
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}
