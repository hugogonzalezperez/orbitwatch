import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: process.env.BASE_PATH ?? '/', // en GitHub Pages el sitio cuelga de /orbitwatch/ (lo fija el flujo de despliegue)
  plugins: [react()],
  worker: { format: 'es' }, // satellite.js incluye workers WASM con await de nivel superior; el formato por defecto (iife) no lo admite
  test: { include: ['tests/**/*.test.ts'] },
})
