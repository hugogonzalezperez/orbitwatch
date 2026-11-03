import { defineConfig } from '@playwright/test'

// Prueba de humo contra el build de producción. Hace falta tener los datos (`npm run data`).
// Usa el Chrome del sistema con renderizado por software: así no depende de una versión de navegador ni de una GPU.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173',
    channel: 'chrome',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 120_000 },
})
