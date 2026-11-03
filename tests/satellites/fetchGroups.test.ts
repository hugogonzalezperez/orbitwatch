import { describe, expect, it } from 'vitest'
import { CelestrakError } from '../../src/satellites/data/celestrak'
import { fetchGroups, groupUrl } from '../../src/satellites/data/fetchGroups'
import { stationsRaw } from '../helpers/fixtures'

const UA = 'orbitwatch-test/0'
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

/** Un `fetch` falso que responde por turnos y cuenta las llamadas. */
const fake = (...responses: Array<Response | Error>) => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init })
    const next = responses[calls.length - 1]
    if (!next) throw new Error('petición no esperada')
    if (next instanceof Error) throw next
    return next
  }) as typeof fetch
  return { fetchImpl, calls }
}

describe('groupUrl', () => {
  it('usa celestrak.org, el grupo y FORMAT=json explícito', () => {
    expect(groupUrl('active')).toBe('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json')
  })
})

describe('fetchGroups', () => {
  it('descarga cada grupo una sola vez, con el User-Agent del proyecto, y valida los registros', async () => {
    const { fetchImpl, calls } = fake(json(stationsRaw))
    const result = await fetchGroups([{ name: 'stations', minObjects: 5 }], { fetchImpl, userAgent: UA })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'stations', rejected: 0 })
    expect(result[0]!.records).toHaveLength(20)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toContain('GROUP=stations&FORMAT=json')
    expect((calls[0]!.init?.headers as Record<string, string>)['User-Agent']).toBe(UA)
  })

  it('una redirección se trata como error: CelesTrak avisa de que .com responde 301', async () => {
    const { fetchImpl, calls } = fake(json(stationsRaw))
    await fetchGroups([{ name: 'stations', minObjects: 5 }], { fetchImpl, userAgent: UA })
    expect(calls[0]!.init?.redirect).toBe('error')
  })

  it('con un 403 en el primer grupo no se hace ninguna petición más ni se reintenta', async () => {
    const { fetchImpl, calls } = fake(json({}, 403), json(stationsRaw))
    const groups = [
      { name: 'active', minObjects: 5 },
      { name: 'stations', minObjects: 5 },
    ]
    await expect(fetchGroups(groups, { fetchImpl, userAgent: UA })).rejects.toMatchObject({ name: 'CelestrakError', group: 'active', status: 403 })
    expect(calls).toHaveLength(1)
  })

  it('con 200 en el primero y 403 en el segundo se detiene ahí: 2 peticiones y ninguna más', async () => {
    const { fetchImpl, calls } = fake(json(stationsRaw), json({}, 403), json(stationsRaw))
    const groups = [
      { name: 'stations', minObjects: 5 },
      { name: 'active', minObjects: 5 },
      { name: 'visual', minObjects: 5 },
    ]
    await expect(fetchGroups(groups, { fetchImpl, userAgent: UA })).rejects.toMatchObject({ group: 'active', status: 403 })
    expect(calls).toHaveLength(2)
  })

  it.each([
    ['un 404', () => json({}, 404), 404],
    ['un 500', () => json({}, 500), 500],
    ['un 301', () => json({}, 301), 301],
  ])('%s detiene la descarga con el estado en el error', async (_motivo, response, status) => {
    const { fetchImpl, calls } = fake(response())
    await expect(fetchGroups([{ name: 'active', minObjects: 5 }], { fetchImpl, userAgent: UA })).rejects.toMatchObject({ status })
    expect(calls).toHaveLength(1)
  })

  it('un cuerpo que no es JSON se rechaza', async () => {
    const { fetchImpl } = fake(new Response('<html>mantenimiento</html>', { status: 200 }))
    await expect(fetchGroups([{ name: 'active', minObjects: 5 }], { fetchImpl, userAgent: UA })).rejects.toThrow(/JSON/)
  })

  it('un fallo de red se rechaza como CelestrakError sin estado', async () => {
    const { fetchImpl } = fake(new TypeError('fetch failed'))
    const error = await fetchGroups([{ name: 'active', minObjects: 5 }], { fetchImpl, userAgent: UA }).catch((e) => e)
    expect(error).toBeInstanceOf(CelestrakError)
    expect(error.status).toBeUndefined()
  })

  it('un conjunto con menos objetos de los esperados se rechaza', async () => {
    const { fetchImpl } = fake(json(stationsRaw))
    await expect(fetchGroups([{ name: 'active', minObjects: 1000 }], { fetchImpl, userAgent: UA })).rejects.toThrow(/al menos 1000/)
  })

  it('espera entre un grupo y el siguiente, no antes del primero ni después del último', async () => {
    const waits: number[] = []
    const { fetchImpl } = fake(json(stationsRaw), json(stationsRaw), json(stationsRaw))
    const groups = ['a', 'b', 'c'].map((name) => ({ name, minObjects: 5 }))
    await fetchGroups(groups, { fetchImpl, userAgent: UA, delayMs: 700, sleep: async (ms) => void waits.push(ms) })
    expect(waits).toEqual([700, 700])
  })

  it('tras un error no espera ni pide más', async () => {
    const waits: number[] = []
    const { fetchImpl, calls } = fake(json({}, 403), json(stationsRaw))
    const groups = ['a', 'b'].map((name) => ({ name, minObjects: 5 }))
    await expect(fetchGroups(groups, { fetchImpl, userAgent: UA, delayMs: 700, sleep: async (ms) => void waits.push(ms) })).rejects.toThrow()
    expect(waits).toEqual([])
    expect(calls).toHaveLength(1)
  })
})

