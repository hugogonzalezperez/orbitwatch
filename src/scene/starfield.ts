import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial } from 'three'
import { temeToScene } from '../shared/frames'

export interface Stars {
  /** Direcciones unitarias en el marco inercial (ecuador J2000), tripletas x, y, z. */
  directions: Float32Array
  /** 0 (apenas se ve) a 1 (la más brillante). */
  brightness: Float32Array
  /** 0 (azulada) a 1 (anaranjada). */
  tint: Float32Array
}

// Matriz de galácticas a ecuatoriales J2000 (columnas: ejes galácticos expresados en el ecuador): el plano de la Vía
// Láctea queda donde está en el cielo real, aunque las estrellas sean aleatorias y no las de un catálogo.
const GALACTIC_TO_EQUATORIAL = [
  [-0.0548755604, 0.4941094279, -0.867666149],
  [-0.8734370902, -0.44482963, -0.1980763734],
  [-0.4838350155, 0.7469822445, 0.4559837762],
] as const

const GALACTIC_SHARE = 0.45 // fracción de estrellas apretada junto al plano galáctico
const GALACTIC_SPREAD_DEG = 8

// Generador pseudoaleatorio con semilla (mulberry32): el mismo cielo en cada carga y en cada prueba.
function random(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Cielo de estrellas aleatorias, con una banda más densa en el plano de la Vía Láctea. */
export function generateStars(count: number, seed: number): Stars {
  const next = random(seed)
  const directions = new Float32Array(count * 3)
  const brightness = new Float32Array(count)
  const tint = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    let x: number, y: number, z: number
    if (next() < GALACTIC_SHARE) {
      const longitude = next() * 2 * Math.PI
      // Latitud galáctica gaussiana (Box-Muller): la mayoría cerca del plano.
      const latitude = Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next()) * ((GALACTIC_SPREAD_DEG * Math.PI) / 180)
      const g = [Math.cos(latitude) * Math.cos(longitude), Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude)]
      ;[x, y, z] = GALACTIC_TO_EQUATORIAL.map((row) => row[0] * g[0]! + row[1] * g[1]! + row[2] * g[2]!) as [number, number, number]
    } else {
      // Uniforme sobre la esfera: z en [-1, 1] y longitud uniforme.
      z = 2 * next() - 1
      const longitude = next() * 2 * Math.PI
      const ring = Math.sqrt(1 - z * z)
      x = ring * Math.cos(longitude)
      y = ring * Math.sin(longitude)
    }
    directions.set([x, y, z], i * 3)
    brightness[i] = next() ** 5 // casi todas tenues, muy pocas brillantes
    tint[i] = next()
  }
  return { directions, brightness, tint }
}

// Las estrellas están en el infinito: la vista solo aporta su rotación (sin paralaje al orbitar) y la profundidad
// se fuerza al fondo (xyww), así que cualquier cosa más cercana, como la Tierra, las tapa.
const VERTEX = /* glsl */ `
  attribute float aBrightness;
  attribute float aTint;
  uniform float uPixelRatio;
  varying float vBrightness;
  varying float vTint;
  void main() {
    vBrightness = aBrightness;
    vTint = aTint;
    gl_Position = (projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0)).xyww;
    gl_PointSize = (1.0 + 1.6 * aBrightness) * uPixelRatio;
  }
`

// Puntos suaves y poco saturados: el color intenso queda para los datos (DESIGN.md).
const FRAGMENT = /* glsl */ `
  varying float vBrightness;
  varying float vTint;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float alpha = (1.0 - smoothstep(0.2, 1.0, d)) * (0.18 + 0.82 * vBrightness) * 0.9;
    vec3 color = mix(vec3(0.66, 0.78, 1.0), vec3(1.0, 0.86, 0.68), vTint);
    gl_FragColor = vec4(mix(vec3(1.0), color, 0.55), alpha);
    #include <colorspace_fragment>
  }
`

export function createStarfield(pixelRatio: number, count = 9000, seed = 7): Points {
  const stars = generateStars(count, seed)
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions.set(temeToScene(stars.directions[i * 3]!, stars.directions[i * 3 + 1]!, stars.directions[i * 3 + 2]!), i * 3)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aBrightness', new BufferAttribute(stars.brightness, 1))
  geometry.setAttribute('aTint', new BufferAttribute(stars.tint, 1))
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uPixelRatio: { value: pixelRatio } },
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  const stars3d = new Points(geometry, material)
  stars3d.frustumCulled = false // sus posiciones no son posiciones del mundo
  stars3d.renderOrder = -2 // al fondo, antes que el Sol
  return stars3d
}
