/** Radio mínimo de una esfera facetada: el centro de cada cara queda por debajo de los vértices, que sí están en `radius`. */
export const facetedSphereMinRadius = (radius: number, widthSegments: number, heightSegments: number): number =>
  radius * Math.cos(Math.hypot(Math.PI / widthSegments, Math.PI / (2 * heightSegments)))
