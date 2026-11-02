# OrbitWatch

Visualizador 3D de satélites en órbita, en el navegador, con cribado de acercamientos entre objetos. Proyecto de portfolio centrado en rendimiento medido.

**Estado:** Tierra con texturas y nubes, reloj simulado (adelante, atrás, pausa y vuelta a la hora del equipo) y la ISS moviéndose sobre ella. Al pulsar sobre la ISS se abre un panel con su posición, la hora, la edad de los datos y su órbita actual. La luz es la del Sol real a la hora simulada (terminador, brillo del mar y sombra de la Tierra sobre la ISS). Con una atmósfera de velo azul sobre el borde que sigue al Sol, y fondo de estrellas. Siguientes: catálogo completo de CelesTrak, cribado. Ver [ARCHITECTURE.md](ARCHITECTURE.md).

## Uso

```bash
npm install
npm run dev        # servidor de desarrollo (http://localhost:5173)
npm test           # tests (Vitest)
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + build de producción en dist/
```

## Datos de la ISS

`public/data/stations.json` es una instantánea de CelesTrak (grupo `stations`); `manifest.json` guarda cuándo se descargó. Para refrescarla: `scripts/update-stations.sh` (una descarga por actualización de CelesTrak, que se actualiza cada 2 h; se detiene ante cualquier respuesta distinta de 200). Mientras no haya Action, la posición pierde precisión con los días y la interfaz lo indica. `?t=2026-03-20T14:46:00Z` en la URL arranca el reloj en esa hora, en pausa.

## Texturas

Los `.ktx2` de `public/textures/earth/` están generados. Para rehacerlos: `scripts/build-textures.sh` (necesita `toktx` ≥ 4.4 de KTX-Software, `curl` y `python3` con Pillow). Las nubes son una foto fija, no el tiempo real.

Créditos: texturas de [Solar System Scope](https://www.solarsystemscope.com/textures/), licencia CC BY 4.0.

## Documentación

- [ARCHITECTURE.md](ARCHITECTURE.md): flujo de datos, carpetas y decisiones técnicas.
- [DESIGN.md](DESIGN.md): lenguaje visual.
