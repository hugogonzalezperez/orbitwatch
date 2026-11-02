import { altitudeKmToDistance } from '../shared/units'

// Límites de zoom: distancia al centro de la Tierra, en unidades de escena.
export const MIN_DISTANCE = altitudeKmToDistance(2_000)
export const MAX_DISTANCE = altitudeKmToDistance(120_000) // deja encuadrar una órbita geoestacionaria entera (6,6 radios) y la más lejana de los datos (7,3)
/** Radio de la órbita más lejana que se dibuja: hasta aquí no se recorta ningún satélite. Cubre geoestacionarias (6,6) y Molniya (7,3); algo más lejos quedaría cortado. */
export const MAX_ORBIT_RADIUS = altitudeKmToDistance(70_000)
export const INITIAL_DISTANCE = 3.5
export const INITIAL_ELEVATION_DEG = 10 // latitud desde la que mira la cámara al arrancar

export const CAMERA_FOV_DEG = 45
export const MAX_PIXEL_RATIO = 2

export const SPACE_COLOR = 0x000000
