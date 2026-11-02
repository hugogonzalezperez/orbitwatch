import type { GroupSpec } from './fetchGroups'

/** Grupos de CelesTrak que se descargan; cada uno es una categoría. Los mínimos son holgados: solo detectan una respuesta rota. */
export const DATA_GROUPS: GroupSpec[] = [
  { name: 'stations', minObjects: 3 },
  { name: 'weather', minObjects: 10 },
  { name: 'starlink', minObjects: 1000 },
]
