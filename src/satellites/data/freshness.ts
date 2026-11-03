export type AgeBand = 'ok' | 'aging' | 'stale'

/** CelesTrak actualiza cada 2 h: hasta 3 h desde la descarga es normal, de 3 a 6 h aviso y desde 6 h desactualizado. */
export function dataFreshness(generatedAt: Date, now: Date): AgeBand {
  const hours = Math.max(0, now.getTime() - generatedAt.getTime()) / 3_600_000
  if (hours >= 6) return 'stale'
  return hours >= 3 ? 'aging' : 'ok'
}

/** Días entre la época de los elementos y la hora simulada: positivo si la hora es posterior. */
export const epochDistanceDays = (epoch: Date, simTime: Date): number => (simTime.getTime() - epoch.getTime()) / 86_400_000

/** La precisión de SGP4 baja al alejarse de la época, hacia delante y hacia atrás. */
export function ageBand(days: number): AgeBand {
  const distance = Math.abs(days)
  if (distance >= 7) return 'stale'
  return distance >= 3 ? 'aging' : 'ok'
}
