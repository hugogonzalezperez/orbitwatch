/** Valor de un `<input type="datetime-local">` ("2026-03-20T14:46") para una hora UTC. */
export const toUtcInput = (date: Date): string => date.toISOString().slice(0, 16)

/** La hora UTC que escribe un `<input type="datetime-local">`; `null` si está vacío o no es una fecha. */
export function parseUtcInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return null
  const date = new Date(`${value}${value.length === 16 ? ':00' : ''}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}
