// Mide el arranque y el cálculo del enjambre con el catálogo real de public/data/ (hay que ejecutar antes `npm run data`).
// Uso: npm run bench. Son cifras de Node (V8), no del navegador: ver docs/RENDIMIENTO.md.
import { readFileSync } from 'node:fs'
import { PerspectiveCamera } from 'three'
import { buildCatalog } from '../src/satellites/catalog'
import { parseColumns, toOrbitInput } from '../src/satellites/data/columns'
import { parseManifest } from '../src/satellites/data/manifest'
import { createBatch, createSample, propagateBatch } from '../src/satellites/propagation/batch'
import { createSwarm } from '../src/satellites/propagation/swarm'
import { findApproaches, findApproachesNaive } from '../src/satellites/screening'
import { pickNearest } from '../src/scene/picking'

const DATA = 'public/data'
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!
const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))]!
const timed = <T>(label: string, fn: () => T): T => {
  const start = performance.now()
  const result = fn()
  console.log(`  ${label.padEnd(36)} ${(performance.now() - start).toFixed(0).padStart(4)} ms`)
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
const text = readFileSync(`${DATA}/${manifest.catalog.file}`, 'utf8')
const json = timed(`JSON.parse (${(text.length / 1e6).toFixed(1)} MB)`, () => JSON.parse(text) as unknown)
const columns = timed('comprobar la forma (parseColumns)', () => parseColumns(json))
timed('catálogo (ordenar y claves)', () => buildCatalog(columns))
const input = timed('arrays para el Worker', () => toOrbitInput(columns))
const batch = timed('json2satrec de todos (el Worker)', () => createBatch(input))

console.log(`cálculo de ${columns.id.length} satélites (lo que hace el Worker cada 10 s de tiempo simulado)`)
const sample = createSample(columns.id.length)
const now = Date.now()
const propagation = repeat(30, () => propagateBatch(batch, now, sample))
console.log(`  propagateBatch: primera ${propagation.first.toFixed(1)} ms, mediana ${propagation.median.toFixed(1)} ms, máximo ${propagation.max.toFixed(1)} ms`)

console.log('en la página, por actualización')
const styles = columns.categories.map((id) => ({ id, rgb: [1, 1, 1] as const, opacity: 1 }))
const swarm = createSwarm(columns, styles, { onSample: () => {} })
swarm.update(now)
await new Promise((resolve) => setTimeout(resolve, 1000)) // la muestra llega de forma asíncrona
const positions = new Float32Array(swarm.size * 3)
const extrapolation = repeat(200, () => swarm.positionsAt(now + 5000, positions))
console.log(`  extrapolar a la hora actual: mediana ${extrapolation.median.toFixed(3)} ms, p95 ${extrapolation.p95.toFixed(3)} ms`)
const camera = new PerspectiveCamera(45, 1.6, 0.1, 100)
camera.position.set(0, 0, 4)
camera.lookAt(0, 0, 0)
let i = 0
const picking = repeat(200, () => pickNearest(positions, swarm.size, camera, 1000, 800, 400 + i++, 400, 10))
console.log(`  elegir bajo el puntero:      mediana ${picking.median.toFixed(3)} ms, p95 ${picking.p95.toFixed(3)} ms (primera ${picking.first.toFixed(2)} ms)`)

console.log('cribado de acercamientos (pares a menos de 10 km en un instante)')
const grid = repeat(10, () => findApproaches(positions, swarm.size, 10))
console.log(`  con rejilla:       mediana ${grid.median.toFixed(1)} ms (primera ${grid.first.toFixed(1)} ms)`)
const naiveStart = performance.now()
const naive = findApproachesNaive(positions, swarm.size, 10)
const naiveMs = performance.now() - naiveStart
console.log(`  comparando todos:  ${naiveMs.toFixed(0)} ms (${(naiveMs / grid.median).toFixed(0)} veces más lento)`)
const found = findApproaches(positions, swarm.size, 10)
console.log(`  pares encontrados: ${found.length} (la ingenua, ${naive.length}); el más cercano a ${found[0]?.distanceKm.toFixed(2) ?? '-'} km`)
swarm.dispose()
