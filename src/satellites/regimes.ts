import type { Regime } from './orbitInfo'

/** Color y nombre de cada tipo de órbita al colorear por órbita. El ámbar queda para el seleccionado. */
export const REGIMES: ReadonlyArray<{ id: Regime; label: string; color: number }> = [
  { id: 'low', label: 'Órbita baja', color: 0x57b6f2 },
  { id: 'medium', label: 'Órbita media', color: 0x7fe0b4 },
  { id: 'geosynchronous', label: 'Geosíncrona', color: 0xf08fb4 },
  { id: 'elliptical', label: 'Elíptica', color: 0xb69cf0 },
  { id: 'high', label: 'Órbita alta', color: 0xff9d72 },
]

export type ColorMode = 'category' | 'regime'
