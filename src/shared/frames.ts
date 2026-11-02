// La escena es inercial (ECI): Y hacia arriba, con el norte de TEME en +Y y el eje Y de TEME (90° este) en −Z.
// Es la misma convención que la rejilla y la textura de la Tierra, y conserva la orientación (no es un espejo).
export const temeToScene = (x: number, y: number, z: number): [number, number, number] => [x, z, -y]
