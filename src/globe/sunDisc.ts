import { AdditiveBlending, MathUtils, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three'

const SUN_ANGULAR_RADIUS = 0.2665 * MathUtils.DEG2RAD // el Sol mide 0,53° de diámetro visto desde la Tierra
const GLOW_FACTOR = 9 // el resplandor se extiende nueve veces el radio del disco

// En el infinito, como las estrellas: la vista aporta solo su rotación, la profundidad se fuerza al fondo (xyww) y la Tierra lo
// tapa. El plano se orienta a la cámara en el propio shader, no con matrices del objeto.
const VERTEX = /* glsl */ `
  uniform vec3 uDirection;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 center = mat3(viewMatrix) * uDirection;
    gl_Position = (projectionMatrix * vec4(center + vec3(position.xy, 0.0), 1.0)).xyww;
  }
`

// Disco blanco con borde nítido y un resplandor cálido que decae hacia el borde del plano.
const FRAGMENT = /* glsl */ `
  uniform float uCore;
  varying vec2 vUv;
  void main() {
    float r = length(vUv * 2.0 - 1.0);
    if (r > 1.0) discard;
    float core = 1.0 - smoothstep(uCore * 0.92, uCore, r);
    float glow = pow(1.0 - r, 2.5) * 0.75;
    vec3 color = mix(vec3(1.0, 0.8, 0.5), vec3(1.0), core);
    gl_FragColor = vec4(color, clamp(core + glow, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`

interface SunDisc {
  object: Mesh
  /** Dirección unitaria hacia el Sol en la escena. */
  update(sun: readonly [number, number, number]): void
}

/** El Sol: un disco del tamaño angular real, en la dirección real y a distancia infinita. */
export function createSunDisc(): SunDisc {
  const direction = new Vector3()
  // Con el plano a una unidad de la cámara en el espacio de la vista, su semilado es la tangente del radio angular.
  const half = Math.tan(SUN_ANGULAR_RADIUS) * GLOW_FACTOR
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uCore: { value: 1 / GLOW_FACTOR }, uDirection: { value: direction } },
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false, // pero sí depthTest: si la Tierra está delante, lo tapa
  })
  const object = new Mesh(new PlaneGeometry(half * 2, half * 2), material)
  object.frustumCulled = false
  object.renderOrder = -1 // después de las estrellas
  return { object, update: (sun) => void direction.set(...sun) }
}
