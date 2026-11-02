import { assertHealthy, parseOmmList, type OmmRecord } from './omm'

export interface GroupSpec {
  name: string
  /** Menos objetos válidos que esto y el grupo se rechaza entero. */
  minObjects: number
}

export interface GroupData {
  name: string
  records: OmmRecord[]
  rejected: number
}

export class CelestrakError extends Error {
  constructor(
    message: string,
    readonly group: string,
    /** Código HTTP, si llegó a haber respuesta. */
    readonly status?: number,
  ) {
    super(message)
    this.name = 'CelestrakError'
  }
}

export const groupUrl = (group: string): string => `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=json`

/**
 * Descarga los grupos de uno en uno, una sola vez cada uno. Ante cualquier respuesta distinta de 200 (o un fallo de red,
 * o datos que no valen) se detiene sin reintentar: CelesTrak bloquea la IP si se insiste tras un 403 o un 404.
 */
export async function fetchGroups(
  groups: GroupSpec[],
  { fetchImpl = fetch, userAgent }: { fetchImpl?: typeof fetch; userAgent: string },
): Promise<GroupData[]> {
  const result: GroupData[] = []
  for (const { name, minObjects } of groups) {
    let response: Response
    try {
      response = await fetchImpl(groupUrl(name), { headers: { 'User-Agent': userAgent }, redirect: 'error' })
    } catch (error) {
      throw new CelestrakError(`No se pudo contactar con CelesTrak para ${name}: ${(error as Error).message}`, name)
    }
    if (response.status !== 200) {
      throw new CelestrakError(`CelesTrak respondió HTTP ${response.status} para ${name}; no se reintenta`, name, response.status)
    }
    let json: unknown
    try {
      json = await response.json()
    } catch {
      throw new CelestrakError(`CelesTrak devolvió algo que no es JSON para ${name}`, name, 200)
    }
    const parsed = parseOmmList(json)
    assertHealthy(parsed, minObjects)
    result.push({ name, records: parsed.records, rejected: parsed.rejected })
  }
  return result
}
