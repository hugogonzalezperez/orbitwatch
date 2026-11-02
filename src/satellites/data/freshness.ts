export type AgeBand = 'ok' | 'aging' | 'stale'

/** Días entre la época de los elementos y la hora simulada: positivo si la hora es posterior. */
export const epochDistanceDays = (epoch: Date, simTime: Date): number => (simTime.getTime() - epoch.getTime()) / 86_400_000

/** La precisión de SGP4 baja al alejarse de la época, hacia delante y hacia atrás. */
export function ageBand(days: number): AgeBand {
  const distance = Math.abs(days)
  if (distance >= 7) return 'stale'
  return distance >= 3 ? 'aging' : 'ok'
}
