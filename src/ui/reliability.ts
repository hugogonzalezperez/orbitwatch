import { ageBand, epochDistanceDays, type AgeBand } from '../satellites/data/freshness'
import { dataFreshness } from '../satellites/data/manifest'
import { formatSpan } from './format'

export interface Reliability {
  /** El peor de los avisos: de la época respecto a la hora mostrada y de la descarga respecto a ahora. */
  band: AgeBand
  /** Una línea para la ficha, en lenguaje llano. */
  summary: string
  epochAge: string
  downloadAge: string
}

const SEVERITY: Record<AgeBand, number> = { ok: 0, aging: 1, stale: 2 }

export function describeReliability({ epoch, downloadedAt, simTime, now }: { epoch: Date; downloadedAt: Date; simTime: Date; now: Date }): Reliability {
  const days = epochDistanceDays(epoch, simTime)
  const epochSpan = formatSpan(days * 86_400_000)
  const epochAge = days >= 0 ? `hace ${epochSpan}` : `${epochSpan} después de la hora mostrada`
  const downloadSpan = formatSpan(now.getTime() - downloadedAt.getTime())
  const epochBand = ageBand(days)
  const downloadBand = dataFreshness(downloadedAt, now)

  const downloadWorse = SEVERITY[downloadBand] > SEVERITY[epochBand]
  const band = downloadWorse ? downloadBand : epochBand
  let summary: string
  if (band === 'ok') summary = `Fiable: elementos de ${epochAge}`
  else if (downloadWorse) {
    summary = band === 'stale' ? `Datos desactualizados: descargados hace ${downloadSpan}` : `Puede haber datos más nuevos: descargados hace ${downloadSpan}`
  } else {
    summary = band === 'stale' ? `Poco fiable: la hora está a ${epochSpan} de la época` : `La precisión baja: la hora está a ${epochSpan} de la época`
  }
  return { band, summary, epochAge, downloadAge: `hace ${downloadSpan}` }
}
