import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Group, Line, LineBasicMaterial, LineDashedMaterial } from 'three'
import { ORBIT_POINTS } from '../config'

interface OrbitLine {
  object: Group
  /** `positions`: tripletas x,y,z de la vuelta completa, en orden; deben ser exactamente `ORBIT_POINTS`. */
  setPoints(positions: Float32Array): void
  /** `fraction` de la vuelta (0 a 1) ya recorrida va continua; el resto, discontinuo. */
  setProgress(fraction: number): void
}

/**
 * Una vuelta dibujada con dos líneas que comparten los mismos vértices: lo recorrido y lo que falta.
 * Los buffers se crean una vez y se reescriben: sustituir un atributo dejaría su buffer de GPU sin liberar.
 */
export function createOrbitLine(color: number): OrbitLine {
  const positions = new BufferAttribute(new Float32Array(ORBIT_POINTS * 3), 3).setUsage(DynamicDrawUsage)
  const distances = new BufferAttribute(new Float32Array(ORBIT_POINTS), 1).setUsage(DynamicDrawUsage)
  const pastGeometry = new BufferGeometry().setAttribute('position', positions)
  const futureGeometry = new BufferGeometry().setAttribute('position', positions).setAttribute('lineDistance', distances)
  const past = new Line(pastGeometry, new LineBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false }))
  // Los guiones se miden en unidades de escena (1 = radio terrestre): ≈ 75 km de trazo y 75 km de hueco.
  const future = new Line(
    futureGeometry,
    new LineDashedMaterial({ color, dashSize: 0.012, gapSize: 0.012, transparent: true, opacity: 0.8, depthWrite: false }),
  )
  for (const line of [past, future]) {
    line.frustumCulled = false // la esfera envolvente se calcularía con la vuelta anterior
    line.renderOrder = 2
  }
  const object = new Group().add(past, future)
  object.visible = false

  return {
    object,
    setPoints(points) {
      if (points.length !== ORBIT_POINTS * 3) throw new Error(`La vuelta debe tener ${ORBIT_POINTS} puntos`)
      positions.array.set(points)
      positions.needsUpdate = true
      // Distancia acumulada a lo largo de la línea: es lo que LineDashedMaterial usa para repartir los guiones.
      let length = 0
      for (let i = 1; i < ORBIT_POINTS; i++) {
        const [dx, dy, dz] = [0, 1, 2].map((axis) => points[i * 3 + axis]! - points[(i - 1) * 3 + axis]!)
        length += Math.hypot(dx!, dy!, dz!)
        distances.array[i] = length
      }
      distances.needsUpdate = true
    },
    setProgress(fraction) {
      const done = Math.round(Math.min(1, Math.max(0, fraction)) * (ORBIT_POINTS - 1))
      pastGeometry.setDrawRange(0, done + 1)
      futureGeometry.setDrawRange(done, ORBIT_POINTS - done)
    },
  }
}
