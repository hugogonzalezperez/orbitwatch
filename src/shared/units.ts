// Unidad de escena: 1 = un radio terrestre. Mantiene los números pequeños y la precisión de float32 alta.
export const EARTH_RADIUS_KM = 6371

export const kmToUnits = (km: number): number => km / EARTH_RADIUS_KM

/** Distancia del centro de la Tierra a una cámara situada a `altitudeKm` sobre la superficie. */
export const altitudeKmToDistance = (altitudeKm: number): number => 1 + kmToUnits(altitudeKm)
