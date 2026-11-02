import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Points, ShaderMaterial, Vector3, type WebGLRenderer } from 'three'
import type { Sample } from '../propagation/batch'

const VERTEX = /* glsl */ `
  uniform float uSize;
  uniform float uElapsed; // segundos de tiempo simulado desde la muestra
  uniform vec3 uSun; // dirección unitaria hacia el Sol
  attribute vec3 velocity;
  attribute vec4 color;
  attribute float valid;
  varying vec4 vColor;
  varying float vLit;
  void main() {
    // La muestra trae posición y velocidad; entre muestras el punto sigue su velocidad en línea recta.
    vec3 p = position + velocity * uElapsed;
    // Sombra de la Tierra: el cilindro de radio 1 detrás de la esfera, respecto al Sol, con un borde suave.
    float along = dot(p, uSun);
    float inShadow = step(along, 0.0) * (1.0 - smoothstep(0.97, 1.0, length(p - uSun * along)));
    vLit = mix(1.0, 0.45, inShadow);
    // Opacidad mayor que 1: punto enfatizado (coincide con la búsqueda), más grande. Opacidad 0 o inválido: no se dibuja.
    vColor = vec4(color.rgb, color.a);
    gl_PointSize = uSize * (1.0 + step(1.5, color.a) * 1.5);
    gl_Position = valid > 0.5 && color.a > 0.0
      ? projectionMatrix * modelViewMatrix * vec4(p, 1.0)
      : vec4(2.0, 2.0, 2.0, 1.0); // fuera del encuadre
  }
`

const FRAGMENT = /* glsl */ `
  varying vec4 vColor;
  varying float vLit;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(vColor.rgb, smoothstep(0.5, 0.2, d) * min(vColor.a, 1.0) * vLit);
    #include <colorspace_fragment>
  }
`

interface SwarmPoints {
  object: Points
  /** Sustituye las posiciones y velocidades de partida (una muestra nueva del cálculo). */
  setSample(sample: Sample): void
  /** Sube los colores y opacidades por punto (cuartetos). */
  setColors(colors: Float32Array): void
  /** Segundos de tiempo simulado desde la muestra: el shader mueve cada punto con su velocidad. */
  setElapsed(seconds: number): void
  /** Dirección unitaria hacia el Sol, para oscurecer lo que está en la sombra de la Tierra. */
  setSun(direction: readonly [number, number, number]): void
}

/** Todos los satélites del enjambre en una sola llamada de dibujo, con un hueco fijo por satélite. */
export function createSwarmPoints(renderer: WebGLRenderer, capacity: number, sizePx: number): SwarmPoints {
  const geometry = new BufferGeometry()
  const attribute = (itemSize: number) => new BufferAttribute(new Float32Array(capacity * itemSize), itemSize).setUsage(DynamicDrawUsage)
  const position = attribute(3)
  const velocity = attribute(3)
  const color = attribute(4)
  const valid = attribute(1) // todo a 0: nada se dibuja hasta que llega la primera muestra
  geometry.setAttribute('position', position)
  geometry.setAttribute('velocity', velocity)
  geometry.setAttribute('color', color)
  geometry.setAttribute('valid', valid)
  geometry.setDrawRange(0, capacity)
  const uniforms = {
    uSize: { value: sizePx * renderer.getPixelRatio() },
    uElapsed: { value: 0 },
    uSun: { value: new Vector3(1, 0, 0) },
  }
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false, // la Tierra los oculta (depthTest) pero unos puntos no se tapan entre sí
  })
  const object = new Points(geometry, material)
  object.frustumCulled = false // la esfera envolvente se calcularía con posiciones vacías
  object.renderOrder = 3 // por encima de la Tierra, la rejilla y las nubes

  return {
    object,
    setSample(sample) {
      position.array.set(sample.positions)
      velocity.array.set(sample.velocities)
      valid.array.set(sample.valid)
      position.needsUpdate = velocity.needsUpdate = valid.needsUpdate = true
    },
    setColors(colors) {
      color.array.set(colors)
      color.needsUpdate = true
    },
    setElapsed(seconds) {
      uniforms.uElapsed.value = seconds
    },
    setSun([x, y, z]) {
      uniforms.uSun.value.set(x, y, z)
    },
  }
}
