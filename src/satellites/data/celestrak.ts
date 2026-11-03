export class CelestrakError extends Error {
  constructor(
    message: string,
    readonly group: string,
    /** Código HTTP, si llegó a haber respuesta. */
    readonly status?: number,
  ) {
    super(message)
    this.name = 'CelestrakError'
  }
}

/**
 * Una petición a CelesTrak, sin reintentos ni redirecciones: tras un 403 o un 404, insistir acaba en el bloqueo de la IP.
 * `group` identifica lo pedido en el error; `label` lo nombra en el mensaje.
 */
export async function requestCelestrak(fetchImpl: typeof fetch, url: string, userAgent: string, group: string, label = group): Promise<Response> {
  let response: Response
  try {
    response = await fetchImpl(url, { headers: { 'User-Agent': userAgent }, redirect: 'error' })
  } catch (error) {
    throw new CelestrakError(`No se pudo contactar con CelesTrak para ${label}: ${(error as Error).message}`, group)
  }
  if (response.status !== 200) throw new CelestrakError(`CelesTrak respondió HTTP ${response.status} para ${label}; no se reintenta`, group, response.status)
  return response
}
