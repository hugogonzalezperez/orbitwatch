import { SKY_RADIUS } from '../shared/sun'

/**
 * near/far según la distancia al centro de la Tierra. near crece al alejarse para no perder precisión de profundidad;
 * far llega hasta el Sol, que se dibuja en el cielo a SKY_RADIUS del centro.
 */
export const clipPlanes = (distance: number) => ({
  near: Math.max(0.001, (distance - 1) * 0.1),
  far: distance + SKY_RADIUS + 1,
})
