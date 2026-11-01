import type { Material, Mesh, Object3D } from 'three'

/** Libera geometrías y materiales de todo el árbol. Las texturas las libera quien las cargó. */
export function disposeScene(scene: Object3D): void {
  scene.traverse((object) => {
    const { geometry, material } = object as Partial<Mesh>
    geometry?.dispose()
    ;[material].flat().forEach((m: Material | undefined) => m?.dispose())
  })
}
