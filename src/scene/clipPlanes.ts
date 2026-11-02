import { MAX_ORBIT_RADIUS } from './config'

/** near/far según la distancia al centro de la Tierra: near crece al alejarse para no perder precisión de profundidad; far llega hasta la órbita más lejana. */
export const clipPlanes = (distance: number) => ({
  near: Math.max(0.001, (distance - 1) * 0.1),
  far: distance + MAX_ORBIT_RADIUS, // el satélite más lejano puede estar detrás del globo y no tapado por él
})
