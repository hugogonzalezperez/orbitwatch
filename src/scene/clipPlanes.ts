/** near/far según la distancia al centro de la Tierra: near crece al alejarse para no perder precisión de profundidad. */
export const clipPlanes = (distance: number) => ({
  near: Math.max(0.001, (distance - 1) * 0.1),
  far: distance + 1,
})
