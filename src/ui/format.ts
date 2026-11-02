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

/** "×60", "−×60", "×86 400". */
export const formatSpeed = (speed: number): string =>
  `${speed < 0 ? '−' : ''}×${String(Math.abs(speed)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`

const decimal = (value: number, digits: number): string => value.toFixed(digits).replace('.', ',')

export const formatLatitude = (deg: number): string => `${decimal(Math.abs(deg), 1)}° ${deg < 0 ? 'S' : 'N'}`

/** Este (E) y oeste (O). */
export const formatLongitude = (deg: number): string => `${decimal(Math.abs(deg), 1)}° ${deg < 0 ? 'O' : 'E'}`

export const formatDecimal = decimal
