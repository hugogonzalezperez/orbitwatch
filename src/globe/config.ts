// Radios en unidades de escena (1 = superficie): rejilla < nubes. 1,002 ≈ 13 km de altitud.
export const GRATICULE_RADIUS = 1.001
export const CLOUD_RADIUS = 1.002
// Capa de aire que se ve en el borde: ≈ 290 km, el triple de la real para que se vea. Debajo de la ISS (≈ 400 km).
export const ATMOSPHERE_RADIUS = 1.045

export const EARTH_SEGMENTS = { width: 128, height: 64 }
// Mismas caras que la Tierra: con menos, el centro de cada cara se hunde bajo la superficie (lo comprueba un test).
export const CLOUD_SEGMENTS = { width: 128, height: 64 }
export const CLOUDS_ENABLED = true

export const EARTH_COLOR = 0x1d4e89 // azul liso hasta que llega la textura
export const MAX_ANISOTROPY = 8

// Generados por scripts/build-textures.sh en public/textures/earth.
export const TEXTURE_FILES = {
  dayPreview: 'day-2k.ktx2',
  dayFull: 'day-8k.ktx2',
  specular: 'specular-2k.ktx2',
  clouds: 'clouds-2k.ktx2',
} as const
