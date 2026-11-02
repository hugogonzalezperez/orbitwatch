import type { PerspectiveCamera, Vector3 } from 'three'

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
