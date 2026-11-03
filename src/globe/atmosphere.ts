import { AdditiveBlending, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three'
import { ATMOSPHERE_RADIUS, EARTH_SEGMENTS } from './config'

const VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }
`

// Velo azul claro que se funde sobre el borde, con poco brillo fuera. El brillo es la longitud del camino de la vista dentro
// de la capa (geometría exacta del rayo con las dos esferas): mínimo mirando hacia abajo, máximo en el borde, cero fuera. Sigue al Sol.
const FRAGMENT = /* glsl */ `
  uniform vec3 uSun;
  uniform float uRadius;
  varying vec3 vWorld;
  void main() {
    vec3 origin = cameraPosition;
    vec3 dir = normalize(vWorld - origin);
    float b = dot(origin, dir);
    float c = dot(origin, origin);
    float airHalf = b * b - (c - uRadius * uRadius);
    if (airHalf <= 0.0) discard;
    float entry = -b - sqrt(airHalf);
    float exit = -b + sqrt(airHalf);
    float groundHalf = b * b - (c - 1.0);
    if (groundHalf > 0.0) exit = min(exit, -b - sqrt(groundHalf)); // el suelo corta el camino
    float path = max(exit - entry, 0.0);
    float longest = 2.0 * sqrt(uRadius * uRadius - 1.0); // el rayo que roza la Tierra
    // Sobre el disco el brillo crece suavemente hacia el borde; fuera de él cae más rápido: en el borde ambos valen 1.
    float falloff = groundHalf > 0.0 ? 1.2 : 2.6;
    float density = pow(clamp(path / longest, 0.0, 1.0), falloff);

    vec3 mid = origin + dir * (entry + path * 0.5);
    float day = smoothstep(-0.35, 0.25, dot(normalize(mid), uSun));
    vec3 color = mix(vec3(0.2, 0.48, 1.0), vec3(0.5, 0.76, 1.0), density);
    gl_FragColor = vec4(color, density * day * 0.9);
    #include <colorspace_fragment>
  }
`

export interface Atmosphere {
  object: Mesh
  /** Dirección unitaria hacia el Sol en la escena. */
  update(direction: readonly [number, number, number]): void
}

export function createAtmosphere(): Atmosphere {
  const sun = new Vector3()
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uSun: { value: sun }, uRadius: { value: ATMOSPHERE_RADIUS } },
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  const object = new Mesh(new SphereGeometry(ATMOSPHERE_RADIUS, EARTH_SEGMENTS.width, EARTH_SEGMENTS.height), material)
  object.renderOrder = 2 // después de las nubes y antes de los satélites
  return { object, update: (direction) => void sun.set(...direction) }
}
