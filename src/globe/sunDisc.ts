import { AdditiveBlending, MathUtils, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three'
import { SKY_RADIUS, sunDirectionScene } from '../shared/sun'

const SUN_ANGULAR_RADIUS = 0.2665 * MathUtils.DEG2RAD // el Sol mide 0,53° de diámetro visto desde la Tierra
const GLOW_FACTOR = 9 // el resplandor se extiende nueve veces el radio del disco

// Cartel hacia la cámara hecho en el shader: el plano se desplaza en el espacio de la vista, así que siempre mira de
// frente sin tocar matrices. Girar el objeto en onBeforeRender dejaba un fotograma de retraso con el render bajo demanda.
const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    gl_Position = projectionMatrix * (center + vec4(position.xy, 0.0, 0.0));
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
  update(date: Date): void
}

/** El Sol: un disco del tamaño angular real, en la dirección real, dibujado en el cielo y tapado por la Tierra. */
export function createSunDisc(): SunDisc {
  const coreRadius = SKY_RADIUS * Math.tan(SUN_ANGULAR_RADIUS)
  const size = coreRadius * GLOW_FACTOR * 2
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uCore: { value: 1 / GLOW_FACTOR } },
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false, // pero sí depthTest: si la Tierra está delante, lo tapa
  })
  const object = new Mesh(new PlaneGeometry(size, size), material)
  object.frustumCulled = false
  const direction = new Vector3()
  return {
    object,
    update: (date) => void object.position.copy(direction.set(...sunDirectionScene(date))).multiplyScalar(SKY_RADIUS),
  }
}
