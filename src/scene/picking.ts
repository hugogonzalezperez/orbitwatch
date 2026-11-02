import { Matrix4, Vector3, type PerspectiveCamera } from 'three'

/** ¿La Tierra (esfera de `radius`) tapa el punto visto desde la cámara? */
export function isOccluded(camera: Vector3, point: Vector3, radius = 1): boolean {
  const direction = point.clone().sub(camera)
  const a = direction.dot(direction)
  const b = 2 * camera.dot(direction)
  const c = camera.dot(camera) - radius * radius
  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) return false
  const firstHit = (-b - Math.sqrt(discriminant)) / (2 * a) // 0 = cámara, 1 = punto
  return firstHit > 0 && firstHit < 1
}

/** Posición en píxeles CSS de un punto de la escena, con el origen arriba a la izquierda. */
export function projectToScreen(point: Vector3, camera: PerspectiveCamera, width: number, height: number) {
  const ndc = point.clone().project(camera)
  return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height, inFront: ndc.z >= -1 && ndc.z <= 1 }
}

const TIE_PX = 0.5 // a esta distancia del puntero se consideran igual de cerca y gana el más próximo a la cámara
const viewProjection = new Matrix4()
const candidate = new Vector3()

/**
 * Índice del punto más cercano al puntero (píxeles CSS) dentro de `maxDistancePx`, o -1. `positions` son tripletas en la
 * escena; los que tapa la Tierra o quedan detrás de la cámara no cuentan. Sin asignaciones por punto: se llama con miles.
 */
export function pickNearest(
  positions: ArrayLike<number>,
  count: number,
  camera: PerspectiveCamera,
  width: number,
  height: number,
  pointerX: number,
  pointerY: number,
  maxDistancePx: number,
): number {
  camera.updateMatrixWorld()
  viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  const m = viewProjection.elements
  const maxSquared = maxDistancePx * maxDistancePx
  let best = -1
  let bestDistance = Infinity
  let bestDepth = Infinity
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3]!
    const y = positions[i * 3 + 1]!
    const z = positions[i * 3 + 2]!
    const w = m[3]! * x + m[7]! * y + m[11]! * z + m[15]!
    if (w <= 0) continue // detrás de la cámara
    const screenX = (((m[0]! * x + m[4]! * y + m[8]! * z + m[12]!) / w + 1) / 2) * width
    const screenY = ((1 - (m[1]! * x + m[5]! * y + m[9]! * z + m[13]!) / w) / 2) * height
    const dx = screenX - pointerX
    const dy = screenY - pointerY
    const squared = dx * dx + dy * dy
    if (squared > maxSquared) continue
    const distance = Math.sqrt(squared)
    if (distance > bestDistance + TIE_PX || (distance > bestDistance - TIE_PX && w >= bestDepth)) continue
    if (isOccluded(camera.position, candidate.set(x, y, z))) continue
    best = i
    bestDistance = distance
    bestDepth = w
  }
  return best
}
