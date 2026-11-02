# Rendimiento: qué está medido y qué no

El proyecto no afirma rendimiento sin medirlo. Esta página separa las cifras medidas, con su método, de lo que sigue sin medir.

## Medido

| Qué | Cifra | Método y entorno |
| --- | --- | --- |
| Propagar y colocar los ~11 250 satélites (`swarm.update`) | **9,5 a 10 ms** de mediana en cuatro ejecuciones de `npm run bench`; **13,9 ms** en la primera medición (máximos de 11 a 24 y, una vez, 69 ms) | Node 22 con `tsx`, 30 llamadas seguidas con datos reales de `starlink` y `weather`. La diferencia entre mediciones es la carga de la máquina (la de 13,9 ms se hizo con el navegador y el servidor de desarrollo abiertos); los máximos coinciden con arranque y recolección de basura. ≈ 0,9 a 1,2 µs por objeto. Crear el enjambre cuesta ~120 a 140 ms |
| Elegir el satélite bajo el puntero (`pickNearest`) | **0,066 ms** de mediana (p95: 0,13 a 0,16 ms) | `npm run bench`: 11 250 posiciones reales, 200 llamadas; la primera, con la compilación, tarda de 2 a 3 ms (en una medición anterior con puntos aleatorios, 0,077 ms de mediana) |
| Renders con el reloj en pausa / a 1× | **0 en 3 s / 1 por segundo** | Chrome headless con renderizado por software |
| Llamadas de dibujo | **7** sin selección y **9** con la ISS seleccionada | Mismo entorno; medido antes de añadir el enjambre y la selección de cualquier satélite, que suman una llamada cada uno |
| Paquete de JavaScript | **910 kB** (259 kB comprimido) más 57 kB del cargador Basis y 527 kB (249 kB comprimido) de WebAssembly | `npm run build` |
| Fuentes que se descargan | ≈ 97 kB (IBM Plex Sans 400 y 600, 22 y 24 kB; Source Serif 4, 51 kB; solo subconjunto latino) | Tamaños de los ficheros; el navegador solo pide los subconjuntos que usa |
| Texturas | 2,6 MB (día 8K), 224 kB (día 2K), 341 kB (nubes), 101 kB (brillo del mar) | Tamaño en disco de los `.ktx2` |
| Datos de Starlink | 3,7 MB; 594 kB comprimido | Ver [DATOS.md](DATOS.md) |

## Medidas de las que se deriva alguna decisión

- Recalcular el enjambre cada fotograma costaría de 10 a 14 ms de los 16,7 ms de un fotograma a 60 FPS. Por eso, con el reloj acelerado (en el que la escena se actualiza cada fotograma), el enjambre se recalcula como mucho una vez cada 100 ms; una pausa, un salto o un cambio de velocidad lo recalculan al momento.
- La lista de Starlink pinta entre 14 y 20 filas de 11 156 gracias a su ventana virtual.

## Sin medir

- **FPS y tiempo de frame en una GPU real.** El entorno de pruebas usa renderizado por software (SwiftShader), que no es representativo. Toda cifra de GPU está pendiente.
- **Coste de la atmósfera**, que cubre todo el disco con un paso de relleno de pantalla completa.
- **Consumo de memoria** de la GPU y del hilo principal con el catálogo completo.
- **Móviles y GPUs integradas.**
- **Cualquier propagación en un Web Worker**, que aún no existe.
- **El cálculo en navegador**: las cifras de propagación son de Node (mismo motor V8, pero sin la carga de la página).

## Cómo repetir las medidas

`npm run data` y luego `npm run bench` (`scripts/bench.ts`): mide el enjambre y la selección con los datos reales de `public/data/`. Conviene cerrar otros programas y repetirlo: las medianas varían entre ejecuciones según la carga de la máquina.
