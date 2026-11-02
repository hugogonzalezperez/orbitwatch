import type { Regime } from '../satellites/orbitInfo'

/** Espacio duro: entre cifra y unidad, y entre miles, para que no se parta en dos líneas. */
export const NBSP = '\u00a0'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "14 h 20 min", "2 d 3 h": una duración legible; el signo se ignora. */
export function formatSpan(ms: number): string {
  const span = Math.abs(ms)
  if (span < MINUTE) return `menos de 1${NBSP}min`
  if (span < HOUR) return `${Math.floor(span / MINUTE)}${NBSP}min`
  if (span < DAY) {
    const minutes = Math.floor((span % HOUR) / MINUTE)
    return `${Math.floor(span / HOUR)}${NBSP}h${minutes ? ` ${minutes}${NBSP}min` : ''}`
  }
  const hours = Math.floor((span % DAY) / HOUR)
  return `${Math.floor(span / DAY)}${NBSP}d${hours ? ` ${hours}${NBSP}h` : ''}`
}

/** Entero con espacio duro como separador de miles: "27 576". */
export const formatInteger = (value: number): string => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)

/** Color de un número 0xRRGGBB como valor CSS: "#ffc857". */
export const cssColor = (hex: number): string => `#${hex.toString(16).padStart(6, '0')}`

/** "×60", "−×60", "×86 400". */
export const formatSpeed = (speed: number): string => `${speed < 0 ? '−' : ''}×${formatInteger(Math.abs(speed))}`

const decimal = (value: number, digits: number): string => value.toFixed(digits).replace('.', ',')

export const formatLatitude = (deg: number): string => `${decimal(Math.abs(deg), 1)}° ${deg < 0 ? 'S' : 'N'}`

/** Este (E) y oeste (O). */
export const formatLongitude = (deg: number): string => `${decimal(Math.abs(deg), 1)}° ${deg < 0 ? 'O' : 'E'}`

export const formatDecimal = decimal

/** Estado de iluminación de un satélite según la fracción de disco solar que le llega (1 = al sol, 0 = sombra). */
export function describeSunlight(sunlight: number): string {
  if (sunlight >= 0.999) return 'A la luz del Sol'
  if (sunlight <= 0.001) return 'En la sombra de la Tierra'
  return `En penumbra (${Math.round(sunlight * 100)} % de luz)`
}

const REGIME_LABEL: Record<Regime, string> = {
  low: 'órbita baja',
  medium: 'órbita media',
  geosynchronous: 'órbita geosíncrona',
  elliptical: 'órbita elíptica',
  high: 'órbita alta',
}
export const describeRegime = (regime: Regime): string => REGIME_LABEL[regime]
