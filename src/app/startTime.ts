/** `?t=2026-03-20T14:46:00Z` fija la hora inicial del reloj (verificación y demostraciones). */
export function parseStartTime(search: string): Date | undefined {
  const value = new URLSearchParams(search).get('t')
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}
