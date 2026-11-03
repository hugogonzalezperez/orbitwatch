import type { CatalogColumns, OrbitInput } from '../data/columns'
import { toOrbitInput } from '../data/columns'
import type { ColorMode } from '../regimes'
import type { Sample } from './batch'
import { createTransport as createDefaultTransport, type PropagationTransport } from './transport'

/** Cómo se dibuja una categoría. El estilo `i` corresponde a la categoría `i` de la tabla de las columnas. */
export interface SwarmStyle {
  id: string
  /** Color de la categoría, componentes de 0 a 1. */
  rgb: readonly [number, number, number]
  /** Opacidad de sus puntos sin resaltado, de 0 a 1. Las categorías enormes se apagan para que no tapen al resto. */
  opacity: number
}

/** Segundos de tiempo simulado tras los que se pide una muestra nueva: con la velocidad, el error de extrapolar es de unos 0,4 km en órbita baja. */
export const REFRESH_SECONDS = 10
/** Mientras llega una muestra nueva (un salto de hora), los puntos no se extrapolan más allá de esto: se quedan quietos, no salen disparados. */
export const MAX_EXTRAPOLATION_SECONDS = 60

const DIMMED_OPACITY = 0.12 // se sigue viendo dónde hay satélites, pero no compiten con los resaltados
const EMPHASIZED = 2 // la opacidad no pasa de 1: este valor solo le dice al shader que agrande el punto
const EMPHASIS_MAX = 500 // con más coincidencias, agrandarlas todas sería ruido: solo se atenúa el resto
const FAR = 1e6 // posición de lo que no se ve: fuera de cualquier encuadre y de la zona de selección

export function needsRefresh({ simMs, epochMs, inFlight }: { simMs: number; epochMs: number | null; inFlight: boolean }): boolean {
  if (inFlight) return false
  return epochMs === null || Math.abs(simMs - epochMs) >= REFRESH_SECONDS * 1000
}

/** Segundos que el shader suma a la velocidad para llegar a `simMs` desde la muestra, acotados. */
export function extrapolationSeconds(simMs: number, epochMs: number): number {
  return Math.max(-MAX_EXTRAPOLATION_SECONDS, Math.min(MAX_EXTRAPOLATION_SECONDS, (simMs - epochMs) / 1000))
}

export interface Swarm {
  /** Número de huecos: uno por satélite, siempre en el mismo orden. */
  readonly size: number
  /** Número de catálogo de cada hueco. */
  readonly ids: Uint32Array
  /** Cuartetos r, g, b, opacidad por hueco. Una opacidad mayor que 1 pide dibujar el punto más grande; 0, no dibujarlo. */
  readonly colors: Float32Array
  /** Cambia cada vez que cambian los colores, para saber cuándo volver a subirlos a la GPU. */
  colorsVersion(): number
  /** Pide una muestra nueva si la hora simulada se ha alejado de la vigente. No espera: avisa con `onSample` al llegar. */
  update(simMs: number): void
  /** La muestra vigente, o `null` hasta que llegue la primera. */
  sample(): Sample | null
  /** Satélites que SGP4 pudo calcular en la muestra vigente. */
  validCount(): number
  /** Milisegundos que tardó en llegar la última muestra. */
  latencyMs(): number
  /** Posiciones extrapoladas a `simMs` (tripletas, un hueco cada una); lo inválido y lo oculto, lejos. */
  positionsAt(simMs: number, out: Float32Array): void
  /** Atenúa los que no están en `ids`; `null` los devuelve a su opacidad base. */
  setHighlight(ids: ReadonlySet<number> | null): void
  /** Las categorías de `ids` no se dibujan. */
  setHidden(ids: ReadonlySet<string>): void
  /** Color por categoría o por tipo de órbita; la opacidad sigue siendo la de la categoría. */
  setColorBy(mode: ColorMode): void
  dispose(): void
}

interface Options {
  /** Cómo se calculan los satélites; por defecto, en un Worker si hay. */
  createTransport?: (input: OrbitInput) => PropagationTransport
  /** Se llama cuando llega una muestra nueva. */
  onSample?: () => void
  /** Tipo de órbita de cada hueco (posición en `regimeRgb`) y color de cada tipo, para colorear por órbita. */
  regimes?: Uint8Array
  regimeRgb?: ReadonlyArray<readonly [number, number, number]>
}

/** Muchos satélites sin estado propio: el cálculo va en un Worker y entre muestras se extrapola con la velocidad. */
export function createSwarm(columns: CatalogColumns, styles: SwarmStyle[], { createTransport = createDefaultTransport, onSample, regimes, regimeRgb }: Options = {}): Swarm {
  const size = columns.id.length
  const ids = Uint32Array.from(columns.id)
  const colors = new Float32Array(size * 4)
  const visible = new Uint8Array(size)
  let hidden: ReadonlySet<string> = new Set()
  let highlight: ReadonlySet<number> | null = null
  let colorBy: ColorMode = 'category'
  let version = 0

  const recolor = () => {
    const emphasize = highlight !== null && highlight.size <= EMPHASIS_MAX
    for (let i = 0; i < size; i++) {
      const { id, rgb, opacity } = styles[columns.category[i]!]!
      const shown = !hidden.has(id)
      visible[i] = shown ? 1 : 0
      colors.set(colorBy === 'regime' && regimes && regimeRgb ? regimeRgb[regimes[i]!]! : rgb, i * 4)
      colors[i * 4 + 3] = !shown ? 0 : highlight === null ? opacity : highlight.has(ids[i]!) ? (emphasize ? EMPHASIZED : opacity) : DIMMED_OPACITY
    }
    version++
  }
  recolor()

  const transport = createTransport(toOrbitInput(columns))
  let current: Sample | null = null
  let valid = 0
  let inFlight = false
  let latency = 0
  let disposed = false

  return {
    size,
    ids,
    colors,
    colorsVersion: () => version,
    update(simMs) {
      if (!needsRefresh({ simMs, epochMs: current?.epochMs ?? null, inFlight })) return
      inFlight = true
      const started = performance.now()
      transport
        .request(simMs)
        .then((sample) => {
          inFlight = false
          if (disposed) return
          current = sample
          valid = sample.valid.reduce((n, v) => n + v, 0)
          latency = performance.now() - started
          onSample?.()
        })
        .catch((error: unknown) => {
          inFlight = false
          console.error('No se pudo calcular la posición de los satélites', error)
        })
    },
    sample: () => current,
    validCount: () => valid,
    latencyMs: () => latency,
    positionsAt(simMs, out) {
      if (!current) {
        out.fill(FAR)
        return
      }
      const { positions, velocities, valid: ok, epochMs } = current
      const dt = extrapolationSeconds(simMs, epochMs)
      for (let i = 0; i < size; i++) {
        const show = ok[i] === 1 && visible[i] === 1
        for (let k = 0; k < 3; k++) out[i * 3 + k] = show ? positions[i * 3 + k]! + velocities[i * 3 + k]! * dt : FAR
      }
    },
    setHighlight(next) {
      highlight = next
      recolor()
    },
    setHidden(next) {
      hidden = next
      recolor()
    },
    setColorBy(mode) {
      colorBy = mode
      recolor()
    },
    dispose() {
      disposed = true
      transport.dispose()
    },
  }
}
