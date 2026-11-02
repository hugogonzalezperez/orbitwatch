import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' }, // satellite.js incluye workers WASM con await de nivel superior; el formato por defecto (iife) no lo admite
  test: { include: ['tests/**/*.test.ts'] },
})
