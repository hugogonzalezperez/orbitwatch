// Descarga los grupos de CelesTrak (OMM en JSON) y el SATCAT, los une en un catálogo por columnas con su categoría y lo
// escribe en public/data/ junto al manifiesto. Política de CelesTrak: una descarga por actualización y parar ante cualquier
// respuesta distinta de 200; por eso hay una caché local (2 h para `active`, un día para el resto y el SATCAT, que CelesTrak
// actualiza una o dos veces al día) y una pausa de un segundo entre peticiones.
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { sha256Hex } from '../src/shared/hash'
import { assembleCatalog } from '../src/satellites/data/assemble'
import { encodeColumns } from '../src/satellites/data/columns'
import { fetchGroups } from '../src/satellites/data/fetchGroups'
import { fetchSatcat } from '../src/satellites/data/fetchSatcat'
import { cacheMaxAgeMs, DATA_GROUPS } from '../src/satellites/data/groups'
import { catalogFileName, serializeManifest } from '../src/satellites/data/manifest'
import { createCachedFetch } from './cachedFetch'

const USER_AGENT = 'orbitwatch/0.1 (+https://github.com/hugogonzalezperez/orbitwatch)'
const out = process.argv[2] ?? 'public/data'

const fetchImpl = createCachedFetch({ dir: '.cache/celestrak', maxAgeMs: cacheMaxAgeMs })
const data = await fetchGroups(DATA_GROUPS, { userAgent: USER_AGENT, fetchImpl, delayMs: 1000 })
await new Promise((resolve) => setTimeout(resolve, 1000))
const satcat = await fetchSatcat({ userAgent: USER_AGENT, fetchImpl })

// Todo o nada: nada se escribe hasta que todos los grupos han llegado enteros y válidos.
const entries = assembleCatalog(data, satcat)
const text = JSON.stringify(encodeColumns(entries))
const sha256 = await sha256Hex(text)
const file = catalogFileName(sha256)
await mkdir(out, { recursive: true })
await writeFile(join(out, `${file}.tmp`), text)
await rename(join(out, `${file}.tmp`), join(out, file))
for (const name of await readdir(out)) if (/^catalog\.[0-9a-f]{8}\.json$/.test(name) && name !== file) await rm(join(out, name)) // los de datos anteriores
for (const old of ['stations.json', 'weather.json', 'starlink.json']) await rm(join(out, old), { force: true }) // del formato anterior (un fichero por grupo)
const groups = data.map(({ name, records }) => ({ group: name, count: records.length }))
await writeFile(join(out, 'manifest.json'), serializeManifest(new Date(), { file, count: entries.length, sha256 }, groups))

const byCategory = new Map<string, number>()
for (const { category } of entries) byCategory.set(category, (byCategory.get(category) ?? 0) + 1)
for (const { name, records, rejected } of data) console.log(`${name.padEnd(20)} ${String(records.length).padStart(6)} objetos${rejected ? ` (${rejected} descartados)` : ''}`)
console.log(`\nSATCAT: ${satcat.size} objetos`)
console.log(`${entries.length} objetos únicos en ${byCategory.size} categorías: ${[...byCategory].map(([id, n]) => `${id} ${n}`).join(', ')}`)
const byType = new Map<string, number>()
for (const { type } of entries) byType.set(type, (byType.get(type) ?? 0) + 1)
console.log(`por tipo: ${[...byType].map(([t, n]) => `${t} ${n}`).join(', ')}`)
console.log(`${file}: ${(text.length / 1e6).toFixed(2)} MB en ${out}/`)
