// Mide el arranque y el cálculo del enjambre con los datos reales de public/data/ (hay que ejecutar antes `npm run data`).
// Uso: npm run bench. Son cifras de Node (V8), no del navegador: ver docs/RENDIMIENTO.md.
import { readFileSync } from 'node:fs'
import { PerspectiveCamera } from 'three'
import { buildCatalog } from '../src/satellites/catalog'
import { parseManifest } from '../src/satellites/data/manifest'
import { parseOmmList } from '../src/satellites/data/omm'
import { createBatch, createSample, propagateBatch } from '../src/satellites/propagation/batch'
import { createSwarm } from '../src/satellites/propagation/swarm'
import { pickNearest } from '../src/scene/picking'

const DATA = 'public/data'
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!
const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))]!
const timed = <T>(label: string, fn: () => T): T => {
  const start = performance.now()
  const result = fn()
  console.log(`  ${label.padEnd(34)} ${(performance.now() - start).toFixed(0).padStart(4)} ms`)
  return result
}
const repeat = (times: number, fn: () => void) => {
  const samples: number[] = []
  for (let i = 0; i < times; i++) {
    const start = performance.now()
    fn()
    samples.push(performance.now() - start)
  }
  return { first: samples[0]!, median: median(samples), p95: percentile(samples, 0.95), max: Math.max(...samples) }
}

console.log('arranque (lo que hace la página al cargar)')
const manifest = parseManifest(JSON.parse(readFileSync(`${DATA}/manifest.json`, 'utf8')))
const raw = manifest.sources.map(({ group, file }) => ({ group, text: readFileSync(`${DATA}/${file}`, 'utf8') }))
const json = timed('JSON.parse', () => raw.map(({ group, text }) => ({ group, json: JSON.parse(text) as unknown })))
const groups = timed('validar (parseOmmList)', () => json.map(({ group, json }) => ({ name: group, records: parseOmmList(json).records })))
timed('catálogo (ordenar y claves)', () => buildCatalog(groups))
const records = groups.flatMap((g) => g.records)
const batch = timed('json2satrec de todos (el Worker)', () => createBatch(records))

console.log(`cálculo de ${records.length} satélites (lo que hace el Worker cada 10 s de tiempo simulado)`)
const sample = createSample(records.length)
const now = Date.now()
const propagation = repeat(30, () => propagateBatch(batch, now, sample))
console.log(`  propagateBatch: primera ${propagation.first.toFixed(1)} ms, mediana ${propagation.median.toFixed(1)} ms, máximo ${propagation.max.toFixed(1)} ms`)

console.log('en la página, por actualización')
const swarm = createSwarm(
  groups.map((g) => ({ id: g.name, records: g.records, rgb: [1, 1, 1] as const })),
  { onSample: () => {} },
)
swarm.update(now)
await new Promise((resolve) => setTimeout(resolve, 500)) // la muestra llega de forma asíncrona
const positions = new Float32Array(swarm.size * 3)
const extrapolation = repeat(200, () => swarm.positionsAt(now + 5000, positions))
console.log(`  extrapolar a la hora actual: mediana ${extrapolation.median.toFixed(3)} ms, p95 ${extrapolation.p95.toFixed(3)} ms`)
const camera = new PerspectiveCamera(45, 1.6, 0.1, 100)
camera.position.set(0, 0, 4)
camera.lookAt(0, 0, 0)
let i = 0
const picking = repeat(200, () => pickNearest(positions, swarm.size, camera, 1000, 800, 400 + i++, 400, 10))
console.log(`  elegir bajo el puntero:      mediana ${picking.median.toFixed(3)} ms, p95 ${picking.p95.toFixed(3)} ms (primera ${picking.first.toFixed(2)} ms)`)
swarm.dispose()
