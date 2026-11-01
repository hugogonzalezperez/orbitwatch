# OrbitWatch

Visualizador 3D de satélites en órbita, en el navegador, con cribado de acercamientos entre objetos. Proyecto de portfolio centrado en rendimiento medido.

**Estado:** paso 1 hecho (globo con fondo negro, rotación y zoom limitado). Siguientes: texturas y atmósfera, datos de satélites, propagación, cribado. Ver [ARCHITECTURE.md](ARCHITECTURE.md).

## Uso

```bash
npm install
npm run dev        # servidor de desarrollo (http://localhost:5173)
npm test           # tests (Vitest)
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + build de producción en dist/
```

## Documentación

- [ARCHITECTURE.md](ARCHITECTURE.md): flujo de datos, carpetas y decisiones técnicas.
- [DESIGN.md](DESIGN.md): lenguaje visual.
