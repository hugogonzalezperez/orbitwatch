// Descarga los grupos de CelesTrak (OMM en JSON) a public/data/ y escribe el manifiesto.
// Política de CelesTrak: una descarga por actualización (cada 2 h); ante cualquier respuesta distinta de 200 se para sin reintentar.
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DATA_GROUPS } from '../src/satellites/data/groups'
import { fetchGroups } from '../src/satellites/data/fetchGroups'
import { serializeManifest, type ManifestSource } from '../src/satellites/data/manifest'

const USER_AGENT = 'orbitwatch/0.1 (+https://github.com/hugogonzalezperez/orbitwatch)'
const out = process.argv[2] ?? 'public/data'

const data = await fetchGroups(DATA_GROUPS, { userAgent: USER_AGENT })

// Todo o nada: los ficheros se escriben solo si los grupos han llegado enteros y válidos.
await mkdir(out, { recursive: true })
const sources: ManifestSource[] = []
for (const { name, records, rejected } of data) {
  const file = `${name}.json`
  await writeFile(join(out, `${file}.tmp`), JSON.stringify(records))
  await rename(join(out, `${file}.tmp`), join(out, file))
  sources.push({ group: name, file, count: records.length })
  console.log(`${name}: ${records.length} objetos${rejected ? ` (${rejected} descartados)` : ''}`)
}
await writeFile(join(out, 'manifest.json'), serializeManifest(new Date(), sources))
console.log(`Escrito en ${out}/`)
