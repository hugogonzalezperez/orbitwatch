import { CelestrakError } from './fetchGroups'
import { parseSatcat, SATCAT_URL, type SatcatRow } from './satcat'

/** Menos filas que esto y el SATCAT se rechaza: hoy tiene unas 71 000 y solo detecta un fichero cortado o roto. */
const MIN_ROWS = 40_000

/**
 * Descarga el SATCAT una vez y lo lee. Como con los grupos, ante cualquier respuesta distinta de 200 (o un fallo de red, o un
 * fichero que no vale) se detiene sin reintentar.
 */
export async function fetchSatcat({
  fetchImpl = fetch,
  userAgent,
  minRows = MIN_ROWS,
}: {
  fetchImpl?: typeof fetch
  userAgent: string
  minRows?: number
}): Promise<Map<number, SatcatRow>> {
  let response: Response
  try {
    response = await fetchImpl(SATCAT_URL, { headers: { 'User-Agent': userAgent }, redirect: 'error' })
  } catch (error) {
    throw new CelestrakError(`No se pudo contactar con CelesTrak para el SATCAT: ${(error as Error).message}`, 'satcat')
  }
  if (response.status !== 200) throw new CelestrakError(`CelesTrak respondió HTTP ${response.status} para el SATCAT; no se reintenta`, 'satcat', response.status)
  const satcat = parseSatcat(await response.text())
  if (satcat.size < minRows) throw new Error(`El SATCAT trae ${satcat.size} objetos; se esperaban al menos ${minRows}`)
  return satcat
}
