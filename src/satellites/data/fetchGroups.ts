import { CelestrakError, requestCelestrak } from './celestrak'
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

export const groupUrl = (group: string): string => `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=json`

/**
 * Descarga los grupos de uno en uno, una vez cada uno. Ante cualquier respuesta distinta de 200, fallo de red o datos que
 * no valen, se detiene sin reintentar: CelesTrak bloquea la IP si se insiste tras un 403 o un 404.
 */
export async function fetchGroups(
  groups: GroupSpec[],
  {
    fetchImpl = fetch,
    userAgent,
    delayMs = 0,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  }: { fetchImpl?: typeof fetch; userAgent: string; delayMs?: number; sleep?: (ms: number) => Promise<void> },
): Promise<GroupData[]> {
  const result: GroupData[] = []
  for (const { name, minObjects } of groups) {
    if (result.length > 0 && delayMs > 0) await sleep(delayMs) // cortesía con CelesTrak: no se piden seguidos
    const response = await requestCelestrak(fetchImpl, groupUrl(name), userAgent, name)
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
