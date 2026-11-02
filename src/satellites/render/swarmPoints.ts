import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Points, ShaderMaterial, type WebGLRenderer } from 'three'

const VERTEX = /* glsl */ `
  uniform float uSize;
  attribute vec4 color;
  varying vec4 vColor;
  void main() {
    vColor = color;
    // opacidad > 1: punto enfatizado (coincide con la búsqueda), más grande
    gl_PointSize = uSize * (1.0 + step(1.5, color.a) * 1.5);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  varying vec4 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(vColor.rgb, smoothstep(0.5, 0.2, d) * min(vColor.a, 1.0));
    #include <colorspace_fragment>
  }
`

interface SwarmPoints {
  object: Points
  /** Copia las `count` primeras posiciones (tripletas) y colores con opacidad (cuartetos) y dibuja solo esos puntos. */
  setFrame(positions: ArrayLike<number>, colors: ArrayLike<number>, count: number): void
}

/** Todos los satélites del enjambre en una sola llamada de dibujo, con el color de su grupo. */
export function createSwarmPoints(renderer: WebGLRenderer, capacity: number, sizePx: number): SwarmPoints {
  const geometry = new BufferGeometry()
  const position = new BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(DynamicDrawUsage)
  const color = new BufferAttribute(new Float32Array(capacity * 4), 4).setUsage(DynamicDrawUsage)
  geometry.setAttribute('position', position)
  geometry.setAttribute('color', color)
  geometry.setDrawRange(0, 0)
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uSize: { value: sizePx * renderer.getPixelRatio() } },
    transparent: true,
    depthWrite: false, // la Tierra los oculta (depthTest) pero unos puntos no se tapan entre sí
  })
  const object = new Points(geometry, material)
  object.frustumCulled = false // la esfera envolvente se calcularía con posiciones vacías
  object.renderOrder = 3 // por encima de la Tierra, la rejilla y las nubes

  return {
    object,
    setFrame(positions, colors, count) {
      for (let i = 0; i < count * 3; i++) position.array[i] = positions[i]!
      for (let i = 0; i < count * 4; i++) color.array[i] = colors[i]!
      position.needsUpdate = true
      color.needsUpdate = true
      geometry.setDrawRange(0, count)
    },
  }
}
