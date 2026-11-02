import { BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, type WebGLRenderer } from 'three'

const VERTEX = /* glsl */ `
  uniform float uSize;
  void main() {
    gl_PointSize = uSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Disco con núcleo brillante y halo suave; el borde del punto se descarta.
const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float halo = smoothstep(0.5, 0.0, d);
    float alpha = max(smoothstep(0.2, 0.12, d), halo * halo * 0.7);
    gl_FragColor = vec4(uColor, alpha);
    #include <colorspace_fragment>
  }
`

export interface SatellitePoints {
  object: Points
  /** `positions` son tripletas x,y,z en la escena; solo se dibujan las `count` primeras. */
  setPositions(positions: ArrayLike<number>, count: number): void
}

/** Una sola llamada de dibujo para todos los puntos; hoy solo la ISS, pero el diseño es el de miles. */
export function createSatellitePoints(
  renderer: WebGLRenderer,
  capacity: number,
  { color, sizePx }: { color: number; sizePx: number },
): SatellitePoints {
  const geometry = new BufferGeometry()
  const attribute = new BufferAttribute(new Float32Array(capacity * 3), 3)
  geometry.setAttribute('position', attribute)
  geometry.setDrawRange(0, 0)
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uSize: { value: sizePx * renderer.getPixelRatio() }, uColor: { value: new Color(color) } },
    transparent: true,
    depthWrite: false, // la Tierra los oculta (depthTest) pero unos puntos no se tapan entre sí
  })
  const object = new Points(geometry, material)
  object.frustumCulled = false // la esfera envolvente se calcularía con posiciones vacías
  object.renderOrder = 3 // por encima de la Tierra, la rejilla y las nubes

  return {
    object,
    setPositions(positions, count) {
      for (let i = 0; i < count * 3; i++) attribute.array[i] = positions[i]!
      attribute.needsUpdate = true
      geometry.setDrawRange(0, count)
    },
  }
}
