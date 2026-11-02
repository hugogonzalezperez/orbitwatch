import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments, MathUtils } from 'three'
import { GRATICULE_RADIUS } from './config'

const GRATICULE_STEP_DEG = 15
const GRATICULE_SEGMENTS = 96

const point = (latDeg: number, lonDeg: number, radius: number): [number, number, number] => {
  const lat = latDeg * MathUtils.DEG2RAD
  const lon = lonDeg * MathUtils.DEG2RAD
  return [radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon)]
}

/** Pares de vértices (para LineSegments) de paralelos (sin polos) y meridianos de polo a polo. */
export function graticuleVertices(stepDeg: number, segments: number, radius: number): Float32Array {
  if (90 % stepDeg !== 0) throw new Error(`El paso (${stepDeg}°) debe dividir 90°`)
  const out: number[] = []
  const line = (at: (t: number) => [number, number, number]) => {
    for (let i = 0; i < segments; i++) out.push(...at(i / segments), ...at((i + 1) / segments))
  }
  for (let lat = -90 + stepDeg; lat < 90; lat += stepDeg) line((t) => point(lat, t * 360, radius))
  for (let lon = 0; lon < 360; lon += stepDeg) line((t) => point(-90 + t * 180, lon, radius))
  return new Float32Array(out)
}

export function createGraticule(): LineSegments {
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(graticuleVertices(GRATICULE_STEP_DEG, GRATICULE_SEGMENTS, GRATICULE_RADIUS), 3),
  )
  return new LineSegments(geometry, new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 }))
}
