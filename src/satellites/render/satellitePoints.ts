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
  uniform vec3 uRingColor;
  uniform float uSelected;
  uniform float uSunlight;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float halo = smoothstep(0.5, 0.0, d);
    float core = smoothstep(0.1, 0.06, d);
    // en la sombra de la Tierra el punto se atenúa a la mitad: sigue siendo localizable
    float alpha = max(core, halo * halo * 0.5) * mix(0.5, 1.0, uSunlight);
    vec3 color = uColor;
    // anillo fino alrededor del punto cuando está seleccionado
    float ring = uSelected * (1.0 - smoothstep(0.03, 0.05, abs(d - 0.4)));
    color = mix(color, uRingColor, ring);
    alpha = max(alpha, ring);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

interface SatellitePoints {
  object: Points
  setSelected(selected: boolean): void
  /** 1 = al sol, 0 = en la sombra de la Tierra. */
  setSunlight(sunlight: number): void
  /** `positions` son tripletas x,y,z en la escena; solo se dibujan las `count` primeras. */
  setPositions(positions: ArrayLike<number>, count: number): void
}

/** Los puntos del satélite seleccionado, en una sola llamada de dibujo. */
export function createSatellitePoints(
  renderer: WebGLRenderer,
  capacity: number,
  { color, ringColor, sizePx }: { color: number; ringColor: number; sizePx: number },
): SatellitePoints {
  const geometry = new BufferGeometry()
  const attribute = new BufferAttribute(new Float32Array(capacity * 3), 3)
  geometry.setAttribute('position', attribute)
  geometry.setDrawRange(0, 0)
  const uniforms = {
    uSize: { value: sizePx * renderer.getPixelRatio() },
    uColor: { value: new Color(color) },
    uRingColor: { value: new Color(ringColor) },
    uSelected: { value: 0 },
    uSunlight: { value: 1 },
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
    setSelected(selected) {
      uniforms.uSelected.value = selected ? 1 : 0
    },
    setSunlight(sunlight) {
      uniforms.uSunlight.value = sunlight
    },
    setPositions(positions, count) {
      for (let i = 0; i < count * 3; i++) attribute.array[i] = positions[i]!
      attribute.needsUpdate = true
      geometry.setDrawRange(0, count)
    },
  }
}
