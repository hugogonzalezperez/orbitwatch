const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "14 h 20 min", "2 d 3 h": una duración legible; el signo se ignora. */
export function formatSpan(ms: number): string {
  const span = Math.abs(ms)
  if (span < MINUTE) return 'menos de 1 min'
  if (span < HOUR) return `${Math.floor(span / MINUTE)} min`
  if (span < DAY) {
    const minutes = Math.floor((span % HOUR) / MINUTE)
    return `${Math.floor(span / HOUR)} h${minutes ? ` ${minutes} min` : ''}`
  }
  const hours = Math.floor((span % DAY) / HOUR)
  return `${Math.floor(span / DAY)} d${hours ? ` ${hours} h` : ''}`
}

/** Entero con espacio como separador de miles: "27 576". */
export const formatInteger = (value: number): string => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

/** "×60", "−×60", "×86 400". */
export const formatSpeed = (speed: number): string => `${speed < 0 ? '−' : ''}×${formatInteger(Math.abs(speed))}`

const decimal = (value: number, digits: number): string => value.toFixed(digits).replace('.', ',')

export const formatLatitude = (deg: number): string => `${decimal(Math.abs(deg), 1)}° ${deg < 0 ? 'S' : 'N'}`

/** Este (E) y oeste (O). */
export const formatLongitude = (deg: number): string => `${decimal(Math.abs(deg), 1)}° ${deg < 0 ? 'O' : 'E'}`

export const formatDecimal = decimal

/** Estado del reloj respecto a la hora real del equipo: "Tiempo real", "Adelantada 2 h 10 min"... */
export function describeTimeOffset(simMs: number, realMs: number): string {
  const diff = simMs - realMs
  if (Math.abs(diff) < 2000) return 'Tiempo real'
  return `${diff > 0 ? 'Adelantada' : 'Atrasada'} ${formatSpan(diff)}`
}

/** Estado de iluminación de un satélite según la fracción de disco solar que le llega (1 = al sol, 0 = sombra). */
export function describeSunlight(sunlight: number): string {
  if (sunlight >= 0.999) return 'A la luz del Sol'
  if (sunlight <= 0.001) return 'En la sombra de la Tierra'
  return `En penumbra (${Math.round(sunlight * 100)} % de luz)`
}
