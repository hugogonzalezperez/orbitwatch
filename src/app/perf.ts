/** `?perf` en la URL activa el medidor de rendimiento en pantalla; `?perf=0` lo deja apagado. */
export function isPerfEnabled(search: string): boolean {
  const value = new URLSearchParams(search).get('perf')
  return value !== null && value !== '0'
}

export type PerfKind = 'render' | 'update'

export interface PerfStats {
  perSecond: number
  meanMs: number
  maxMs: number
}

export interface PerfSnapshot {
  /** Dibujos: lo que cuesta en CPU enviar cada fotograma a la GPU. */
  render: PerfStats
  /** Actualizaciones de la escena (hora, satélite elegido, etiquetas). */
  update: PerfStats
}

export interface PerfMeter {
  record(kind: PerfKind, ms: number, nowMs: number): void
  snapshot(nowMs: number): PerfSnapshot
}

/** Medias y máximos de lo ocurrido en los últimos `windowMs` milisegundos. */
export function createPerfMeter(windowMs = 1000): PerfMeter {
  const events: Record<PerfKind, Array<{ at: number; ms: number }>> = { render: [], update: [] }
  const stats = (kind: PerfKind, nowMs: number): PerfStats => {
    const recent = events[kind].filter((e) => e.at > nowMs - windowMs)
    events[kind] = recent
    if (recent.length === 0) return { perSecond: 0, meanMs: 0, maxMs: 0 }
    const total = recent.reduce((sum, e) => sum + e.ms, 0)
    return { perSecond: (recent.length * 1000) / windowMs, meanMs: total / recent.length, maxMs: Math.max(...recent.map((e) => e.ms)) }
  }
  return {
    record: (kind, ms, nowMs) => void events[kind].push({ at: nowMs, ms }),
    snapshot: (nowMs) => ({ render: stats('render', nowMs), update: stats('update', nowMs) }),
  }
}
