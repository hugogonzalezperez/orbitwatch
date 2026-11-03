// Descarga los grupos de CelesTrak y el SATCAT, los une en un catálogo por columnas y lo escribe en public/data/ con su
// manifiesto. Una descarga por actualización: caché local (ver `cacheMaxAgeMs`) y un segundo de pausa entre peticiones.
import { mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { sha256Hex } from '../src/shared/hash'
import { assembleCatalog } from '../src/satellites/data/assemble'
import { encodeColumns } from '../src/satellites/data/columns'
import { fetchGroups } from '../src/satellites/data/fetchGroups'
import { fetchSatcat } from '../src/satellites/data/fetchSatcat'
import { cacheMaxAgeMs, DATA_GROUPS } from '../src/satellites/data/groups'
import { catalogFileName, FILE_PATTERN, serializeManifest } from '../src/satellites/data/manifest'
import { createCachedFetch } from './cachedFetch'
import { writeAtomic } from './writeAtomic'

const USER_AGENT = 'orbitwatch/0.1 (+https://github.com/hugogonzalezperez/orbitwatch)'
const out = process.argv[2] ?? 'public/data'

const fetchImpl = createCachedFetch({ dir: '.cache/celestrak', maxAgeMs: cacheMaxAgeMs })
const data = await fetchGroups(DATA_GROUPS, { userAgent: USER_AGENT, fetchImpl, delayMs: 1000 })
await new Promise((resolve) => setTimeout(resolve, 1000))
const satcat = await fetchSatcat({ userAgent: USER_AGENT, fetchImpl })

// Todo o nada: nada se escribe hasta que todo ha llegado entero y válido.
const entries = assembleCatalog(data, satcat)
const text = JSON.stringify(encodeColumns(entries))
const sha256 = await sha256Hex(text)
const file = catalogFileName(sha256)
await mkdir(out, { recursive: true })
await writeAtomic(out, file, text)
for (const name of await readdir(out)) if (FILE_PATTERN.test(name) && name !== file) await rm(join(out, name)) // los de datos anteriores
await writeAtomic(out, 'manifest.json', serializeManifest(new Date(), { file, count: entries.length, sha256 }))

const countBy = (key: 'category' | 'type') => {
  const counts = new Map<string, number>()
  for (const entry of entries) counts.set(entry[key], (counts.get(entry[key]) ?? 0) + 1)
  return counts
}
const byCategory = countBy('category')
for (const { name, records, rejected } of data) console.log(`${name.padEnd(20)} ${String(records.length).padStart(6)} objetos${rejected ? ` (${rejected} descartados)` : ''}`)
console.log(`\nSATCAT: ${satcat.size} objetos`)
console.log(`${entries.length} objetos únicos en ${byCategory.size} categorías: ${[...byCategory].map(([id, n]) => `${id} ${n}`).join(', ')}`)
console.log(`por tipo: ${[...countBy('type')].map(([t, n]) => `${t} ${n}`).join(', ')}`)
console.log(`${file}: ${(text.length / 1e6).toFixed(2)} MB en ${out}/`)
