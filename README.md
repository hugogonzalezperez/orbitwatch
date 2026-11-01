# OrbitWatch

Visualizador 3D de satélites en órbita, en el navegador, con cribado de acercamientos entre objetos. Proyecto de portfolio centrado en rendimiento medido.

**Estado:** globo con fondo negro, rotación y zoom limitado, y Tierra con texturas y nubes. Siguientes: atmósfera, datos de satélites, propagación, cribado. Ver [ARCHITECTURE.md](ARCHITECTURE.md).

## Uso

```bash
npm install
npm run dev        # servidor de desarrollo (http://localhost:5173)
npm test           # tests (Vitest)
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + build de producción en dist/
```

## Texturas

Los `.ktx2` de `public/textures/earth/` están generados. Para rehacerlos: `scripts/build-textures.sh` (necesita `toktx` ≥ 4.4 de KTX-Software, `curl` y `python3` con Pillow). Las nubes son una foto fija, no el tiempo real.

Créditos: texturas de [Solar System Scope](https://www.solarsystemscope.com/textures/), licencia CC BY 4.0.

## Documentación

- [ARCHITECTURE.md](ARCHITECTURE.md): flujo de datos, carpetas y decisiones técnicas.
- [DESIGN.md](DESIGN.md): lenguaje visual.
