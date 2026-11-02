import { mkdtempSync, readdirSync, rmSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCachedFetch } from '../../scripts/cachedFetch'

const HOUR = 3_600_000
let dir: string
beforeEach(() => void (dir = mkdtempSync(join(tmpdir(), 'orbitwatch-cache-'))))
afterEach(() => rmSync(dir, { recursive: true, force: true }))

/** Un fetch falso que cuenta las llamadas y responde con lo que se le diga. */
const fake = (respond: (url: string) => Response = (url) => new Response(`cuerpo de ${url}`)) => {
  const calls: string[] = []
  const fetchImpl = (async (input: RequestInfo | URL) => {
    calls.push(String(input))
    return respond(String(input))
  }) as typeof fetch
  return { fetchImpl, calls }
}

describe('createCachedFetch', () => {
  it('la primera vez va a la red y guarda la respuesta; la segunda sale de la caché sin tocar la red', async () => {
    const { fetchImpl, calls } = fake()
    const cached = createCachedFetch({ dir, maxAgeMs: 2 * HOUR, fetchImpl })
    expect(await (await cached('https://celestrak.org/a')).text()).toBe('cuerpo de https://celestrak.org/a')
    expect(await (await cached('https://celestrak.org/a')).text()).toBe('cuerpo de https://celestrak.org/a')
    expect(calls).toHaveLength(1)
    expect(readdirSync(dir)).toHaveLength(1)
  })

  it('una respuesta de la caché es un 200 como cualquier otra', async () => {
    const cached = createCachedFetch({ dir, maxAgeMs: 2 * HOUR, fetchImpl: fake().fetchImpl })
    await cached('https://celestrak.org/a')
    const again = await cached('https://celestrak.org/a')
    expect(again.status).toBe(200)
  })

  it('pasada la edad máxima vuelve a descargar', async () => {
    const { fetchImpl, calls } = fake()
    const cached = createCachedFetch({ dir, maxAgeMs: 2 * HOUR, fetchImpl })
    await cached('https://celestrak.org/a')
    const [file] = readdirSync(dir)
    const old = new Date(Date.now() - 3 * HOUR)
    utimesSync(join(dir, file!), old, old)
    await cached('https://celestrak.org/a')
    expect(calls).toHaveLength(2)
  })

  it('una dirección distinta es otra entrada', async () => {
    const { fetchImpl, calls } = fake()
    const cached = createCachedFetch({ dir, maxAgeMs: 2 * HOUR, fetchImpl })
    await cached('https://celestrak.org/a')
    await cached('https://celestrak.org/b')
    expect(calls).toHaveLength(2)
    expect(readdirSync(dir)).toHaveLength(2)
  })

  it('lo que no es un 200 no se guarda y se devuelve tal cual, para que quien llama pare', async () => {
    const { fetchImpl, calls } = fake(() => new Response('prohibido', { status: 403 }))
    const cached = createCachedFetch({ dir, maxAgeMs: 2 * HOUR, fetchImpl })
    expect((await cached('https://celestrak.org/a')).status).toBe(403)
    expect((await cached('https://celestrak.org/a')).status).toBe(403)
    expect(calls).toHaveLength(2) // no se cachea: se vuelve a preguntar... pero quien llama ya habrá parado
    expect(readdirSync(dir)).toHaveLength(0)
  })

  it('crea la carpeta de la caché si no existe', async () => {
    const nested = join(dir, 'a', 'b')
    const cached = createCachedFetch({ dir: nested, maxAgeMs: HOUR, fetchImpl: fake().fetchImpl })
    await cached('https://celestrak.org/a')
    expect(readdirSync(nested)).toHaveLength(1)
  })

  it('pasa las opciones (cabeceras, redirect) a la red', async () => {
    const seen: Array<RequestInit | undefined> = []
    const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(init)
      return new Response('x')
    }) as typeof fetch
    const cached = createCachedFetch({ dir, maxAgeMs: HOUR, fetchImpl })
    await cached('https://celestrak.org/a', { headers: { 'User-Agent': 'prueba' }, redirect: 'error' })
    expect(seen[0]).toMatchObject({ redirect: 'error' })
  })
})
