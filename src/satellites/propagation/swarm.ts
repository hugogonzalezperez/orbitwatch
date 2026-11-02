import type { OmmRecord } from '../data/omm'
import { createTracked, sceneAt, type Tracked } from './position'

export interface SwarmGroup {
  records: OmmRecord[]
  /** Color del grupo, componentes de 0 a 1. */
  rgb: readonly [number, number, number]
}

interface SwarmFrame {
  /** Tripletas x,y,z en la escena (radios terrestres); solo valen las `count` primeras. */
  positions: Float32Array
  /** Tripletas r,g,b alineadas con `positions`. */
  colors: Float32Array
  count: number
}

export interface Swarm {
  update(date: Date): SwarmFrame
}

/** Muchos satélites sin estado propio: solo posición y color de grupo. Los buffers se reutilizan en cada llamada. */
export function createSwarm(groups: SwarmGroup[]): Swarm {
  const members: Array<{ tracked: Tracked; rgb: SwarmGroup['rgb'] }> = groups.flatMap(({ records, rgb }) =>
    records.map((record) => ({ tracked: createTracked(record), rgb })),
  )
  const frame: SwarmFrame = {
    positions: new Float32Array(members.length * 3),
    colors: new Float32Array(members.length * 3),
    count: 0,
  }

  return {
    update(date) {
      let count = 0
      for (const { tracked, rgb } of members) {
        const scene = sceneAt(tracked, date)
        if (!scene) continue // SGP4 no puede calcularlo (por ejemplo, órbita decaída): se omite
        frame.positions.set(scene, count * 3)
        frame.colors.set(rgb, count * 3)
        count++
      }
      frame.count = count
      return frame
    },
  }
}
