import { RepeatWrapping, type Texture, type WebGLRenderer } from 'three'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import { MAX_ANISOTROPY } from './config'

export interface TextureSource {
  /**
   * Carga una textura KTX2 de `public/textures/earth`, la entrega a `apply` y pide dibujar. Nunca rechaza: si falla
   * (o el globo ya se liberó) lo registra y no llama a `apply`.
   */
  load(file: string, apply: (texture: Texture) => void): Promise<void>
  dispose(): void
}

export const createTextureSource = (renderer: WebGLRenderer, invalidate: () => void): TextureSource => {
  const base = import.meta.env.BASE_URL
  const loader = new KTX2Loader().detectSupport(renderer) // sin ruta: Vite empaqueta el transcodificador de three
  const anisotropy = Math.min(MAX_ANISOTROPY, renderer.capabilities.getMaxAnisotropy())
  const loaded = new Set<Texture>()
  let disposed = false

  return {
    async load(file, apply) {
      if (disposed) return
      try {
        const texture = await loader.loadAsync(`${base}textures/earth/${file}`)
        if (disposed) {
          texture.dispose()
          return
        }
        texture.wrapS = RepeatWrapping // sin costura en el meridiano 180°
        texture.anisotropy = anisotropy
        loaded.add(texture)
        apply(texture)
        invalidate()
      } catch (error) {
        console.error(`No se pudo cargar la textura ${file}`, error)
      }
    },
    dispose() {
      disposed = true
      loaded.forEach((texture) => texture.dispose())
      loader.dispose()
    },
  }
}
