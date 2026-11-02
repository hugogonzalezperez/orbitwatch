// Mide el cálculo del enjambre y la selección bajo el puntero con los datos reales de public/data/ (hay que ejecutar antes `npm run data`).
// Uso: npm run bench. Son cifras de Node (V8), no del navegador: ver docs/RENDIMIENTO.md.
import { readFileSync } from 'node:fs'
import { PerspectiveCamera } from 'three'
import { parseManifest } from '../src/satellites/data/manifest'
import { parseOmmList } from '../src/satellites/data/omm'
import { createSwarm } from '../src/satellites/propagation/swarm'
import { pickNearest } from '../src/scene/picking'

const DATA = 'public/data'
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!
const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))]!

const manifest = parseManifest(JSON.parse(readFileSync(`${DATA}/manifest.json`, 'utf8')))
const groups = manifest.sources.map(({ group, file }) => ({
  id: group,
  records: parseOmmList(JSON.parse(readFileSync(`${DATA}/${file}`, 'utf8'))).records,
  rgb: [1, 1, 1] as const,
}))

let start = performance.now()
const swarm = createSwarm(groups)
const createMs = performance.now() - start

const now = Date.now()
const updates: number[] = []
let frame = swarm.update(new Date(now))
for (let i = 0; i < 30; i++) {
  start = performance.now()
  frame = swarm.update(new Date(now + i * 1000))
  updates.push(performance.now() - start)
}
console.log(`enjambre: ${frame.count} satélites, crear ${createMs.toFixed(0)} ms`)
console.log(`  update (30 llamadas): primera ${updates[0]!.toFixed(1)} ms, mediana ${median(updates).toFixed(1)} ms, máximo ${Math.max(...updates).toFixed(1)} ms`)

const camera = new PerspectiveCamera(45, 1.6, 0.1, 100)
camera.position.set(0, 0, 4)
camera.lookAt(0, 0, 0)
const picks: number[] = []
for (let i = 0; i < 200; i++) {
  start = performance.now()
  pickNearest(frame.positions, frame.count, camera, 1000, 800, 400 + i, 400, 10)
  picks.push(performance.now() - start)
}
console.log(`selección (${frame.count} puntos, 200 llamadas): primera ${picks[0]!.toFixed(2)} ms, mediana ${median(picks).toFixed(3)} ms, p95 ${percentile(picks, 0.95).toFixed(3)} ms`)
