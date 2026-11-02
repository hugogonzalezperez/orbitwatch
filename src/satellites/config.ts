export const SATELLITE_COLOR = 0xffc857 // la luz de los datos; ver DESIGN.md
export const SELECTION_COLOR = 0x6aa6e8 // el acento de la interfaz
export const SATELLITE_SIZE_PX = 26 // el punto ocupa el centro; el resto es halo y anillo de selección
export const HIT_RADIUS_PX = 22 // zona de pulsación alrededor del punto, cómoda para el dedo
export const ORBIT_POINTS = 600 // puntos por vuelta: ≈ uno cada 9 s en la ISS, sin ángulos visibles
export const FOCUS_TILT_DEG = 35 // al centrar, la cámara sale del plano de la órbita: en él la elipse se vería de canto
export const SWARM_SIZE_PX = 4 // un punto pequeño: son miles
export const SWARM_FALLBACK_COLOR = 0x9aa5b1
// Provisional hasta definir los colores por régimen orbital en DESIGN.md. El ámbar queda para la ISS.
export const SWARM_COLORS: Record<string, number> = {
  starlink: 0xb7c9e2,
  weather: 0x7fe0b4,
}
export const SWARM_MIN_INTERVAL_MS = 100 // con el reloj acelerado, recalcular miles de órbitas cada fotograma cuesta ~14 ms (medido con 11 230)
