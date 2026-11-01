import { altitudeKmToDistance } from '../shared/units'

// Límites de zoom (altitud sobre la superficie). Se ajustan probando.
export const MIN_DISTANCE = altitudeKmToDistance(2_000)
export const MAX_DISTANCE = altitudeKmToDistance(60_000)
export const INITIAL_DISTANCE = 3.5

export const CAMERA_FOV_DEG = 45
export const MAX_PIXEL_RATIO = 2

export const SPACE_COLOR = 0x000000
export const EARTH_COLOR = 0x1d4e89
