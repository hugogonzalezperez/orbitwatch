import { altitudeKmToDistance } from '../shared/units'

// Límites de zoom: distancia al centro de la Tierra, en unidades de escena.
export const MIN_DISTANCE = altitudeKmToDistance(2_000)
export const MAX_DISTANCE = altitudeKmToDistance(60_000)
export const INITIAL_DISTANCE = 3.5
export const INITIAL_ELEVATION_DEG = 10 // latitud desde la que mira la cámara al arrancar

export const CAMERA_FOV_DEG = 45
export const MAX_PIXEL_RATIO = 2

export const SPACE_COLOR = 0x000000
