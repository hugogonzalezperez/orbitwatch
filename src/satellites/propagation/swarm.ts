import type { OmmRecord } from '../data/omm'
import { createTracked, sceneAt, type Tracked } from './position'

export interface SwarmGroup {
  /** Identificador del grupo (la categoría), para ocultarlo. */
  id: string
  records: OmmRecord[]
  /** Color del grupo, componentes de 0 a 1. */
  rgb: readonly [number, number, number]
  /** Opacidad de sus puntos sin resaltado, de 0 a 1; por defecto 1. Los grupos enormes se apagan para que no tapen al resto. */
  opacity?: number
}

export interface SwarmFrame {
  /** Tripletas x,y,z en la escena (radios terrestres); solo valen las `count` primeras. */
  positions: Float32Array
  /** Cuartetos r,g,b,opacidad alineados con `positions`. Una opacidad mayor que 1 pide dibujar el punto más grande. */
  colors: Float32Array
  /** Número de catálogo de cada posición. */
  ids: Uint32Array
  count: number
}

export interface Swarm {
  update(date: Date): SwarmFrame
  /** Atenúa los que no están en `ids`; `null` los devuelve a todos a su opacidad. Se nota en el siguiente `update`. */
  setHighlight(ids: ReadonlySet<number> | null): void
  /** Los grupos de `ids` no se calculan ni se dibujan. Se nota en el siguiente `update`. */
  setHidden(ids: ReadonlySet<string>): void
}

const DIMMED_OPACITY = 0.12 // se sigue viendo dónde hay satélites, pero no compiten con los resaltados
const EMPHASIZED = 2 // la opacidad no pasa de 1: este valor solo le dice al shader que agrande el punto
const EMPHASIS_MAX = 500 // con más coincidencias, agrandarlas todas sería ruido: solo se atenúa el resto

/** Muchos satélites sin estado propio: solo posición, color de grupo y opacidad. Los buffers se reutilizan en cada llamada. */
export function createSwarm(groups: SwarmGroup[]): Swarm {
  const seen = new Set<number>()
  const members: Array<{ id: number; group: string; tracked: Tracked; rgb: SwarmGroup['rgb']; base: number; opacity: number }> = []
  for (const { id: group, records, rgb, opacity = 1 } of groups) {
    for (const record of records) {
      if (seen.has(record.NORAD_CAT_ID)) continue // un objeto en dos grupos solo cuenta en el primero
      seen.add(record.NORAD_CAT_ID)
      members.push({ id: record.NORAD_CAT_ID, group, tracked: createTracked(record), rgb, base: opacity, opacity })
    }
  }
  const frame: SwarmFrame = {
    positions: new Float32Array(members.length * 3),
    colors: new Float32Array(members.length * 4),
    ids: new Uint32Array(members.length),
    count: 0,
  }
  let hidden: ReadonlySet<string> = new Set()

  return {
    update(date) {
      let count = 0
      for (const { id, group, tracked, rgb, opacity } of members) {
        if (hidden.has(group)) continue
        const scene = sceneAt(tracked, date)
        if (!scene) continue // SGP4 no puede calcularlo (por ejemplo, órbita decaída): se omite
        frame.positions.set(scene, count * 3)
        frame.colors.set(rgb, count * 4)
        frame.colors[count * 4 + 3] = opacity
        frame.ids[count] = id
        count++
      }
      frame.count = count
      return frame
    },
    setHighlight(ids) {
      const emphasize = ids !== null && ids.size <= EMPHASIS_MAX
      for (const member of members) {
        member.opacity = ids === null ? member.base : ids.has(member.id) ? (emphasize ? EMPHASIZED : member.base) : DIMMED_OPACITY
      }
    },
    setHidden(ids) {
      hidden = ids
    },
  }
}
