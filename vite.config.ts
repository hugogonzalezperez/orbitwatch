import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// GitHub Pages no deja poner cabeceras: la política de contenido va en una etiqueta, solo en el build (el servidor de desarrollo inyecta scripts).
const CONTENT_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'", // WebAssembly de SGP4 y de las texturas; el transcodificador Basis (embind) crea funciones con `new Function`, y sin esto no decodifica la Tierra
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

export default defineConfig({
  base: process.env.BASE_PATH ?? '/', // en GitHub Pages el sitio cuelga de /orbitwatch/ (lo fija el flujo de despliegue)
  plugins: [
    react(),
    {
      name: 'content-policy',
      apply: 'build',
      transformIndexHtml: (html) => html.replace('<title>', `<meta http-equiv="Content-Security-Policy" content="${CONTENT_POLICY}" />\n    <title>`),
    },
  ],
  worker: { format: 'es' }, // satellite.js incluye workers WASM con await de nivel superior; el formato por defecto (iife) no lo admite
  test: { include: ['tests/**/*.test.ts'] },
})
