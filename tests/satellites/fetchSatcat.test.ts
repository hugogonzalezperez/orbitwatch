import { describe, expect, it } from 'vitest'
import { CelestrakError } from '../../src/satellites/data/fetchGroups'
import { fetchSatcat } from '../../src/satellites/data/fetchSatcat'
import { SATCAT_URL } from '../../src/satellites/data/satcat'

const UA = 'orbitwatch-test/0'
const HEADER = 'OBJECT_NAME,OBJECT_ID,NORAD_CAT_ID,OBJECT_TYPE,OPS_STATUS_CODE,OWNER,LAUNCH_DATE'
const rows = (n: number) => Array.from({ length: n }, (_, i) => `OBJ ${i + 1},2020-001A,${i + 1},PAY,+,US,2020-01-01`).join('\n')
const csv = (n: number) => `${HEADER}\n${rows(n)}`
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

describe('fetchSatcat', () => {
  it('descarga el SATCAT una sola vez, con el User-Agent del proyecto y sin seguir redirecciones, y lo lee', async () => {
    const { fetchImpl, calls } = fake(new Response(csv(50)))
    const satcat = await fetchSatcat({ fetchImpl, userAgent: UA, minRows: 10 })
    expect(satcat.size).toBe(50)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe(SATCAT_URL)
    expect((calls[0]!.init?.headers as Record<string, string>)['User-Agent']).toBe(UA)
    expect(calls[0]!.init?.redirect).toBe('error')
  })

  it.each([
    ['un 403', () => new Response('', { status: 403 }), 403],
    ['un 404', () => new Response('', { status: 404 }), 404],
    ['un 500', () => new Response('', { status: 500 }), 500],
  ])('con %s para sin reintentar y dice el estado', async (_motivo, response, status) => {
    const { fetchImpl, calls } = fake(response())
    await expect(fetchSatcat({ fetchImpl, userAgent: UA, minRows: 10 })).rejects.toMatchObject({ name: 'CelestrakError', group: 'satcat', status })
    expect(calls).toHaveLength(1)
  })

  it('un fallo de red se rechaza como CelestrakError sin estado', async () => {
    const error = await fetchSatcat({ fetchImpl: fake(new TypeError('fetch failed')).fetchImpl, userAgent: UA, minRows: 10 }).catch((e) => e)
    expect(error).toBeInstanceOf(CelestrakError)
    expect(error.status).toBeUndefined()
  })

  it('un fichero con muy pocas filas se rechaza: no se publica un SATCAT cortado', async () => {
    await expect(fetchSatcat({ fetchImpl: fake(new Response(csv(5))).fetchImpl, userAgent: UA, minRows: 100 })).rejects.toThrow(/al menos 100/)
  })

  it('un cuerpo que no es un CSV de SATCAT se rechaza con el motivo', async () => {
    await expect(fetchSatcat({ fetchImpl: fake(new Response('<html>mantenimiento</html>')).fetchImpl, userAgent: UA, minRows: 10 })).rejects.toThrow(/columnas/)
  })
})
