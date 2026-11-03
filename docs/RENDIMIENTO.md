# Rendimiento: qué está medido y qué no

El proyecto no afirma rendimiento sin medirlo. Esta página separa las cifras medidas, con su método, de lo que sigue sin medir. Para medir en tu equipo, añade `?perf` a la URL (ver más abajo) o ejecuta `npm run bench`.

## Medido en el navegador: antes y después del Worker

Cuánto tiempo pasa el hilo principal ejecutando JavaScript. Método: Chrome headless con renderizado por software, servidor de desarrollo de Vite, métricas `Performance.getMetrics` del protocolo de Chrome (`ScriptDuration` y `TaskDuration`), ventanas de 10 s con el reloj en cada velocidad, **dos ejecuciones por lado**. «Antes del Worker» es el commit anterior a pasar el cálculo al Worker; «catálogo ampliado» es la fase de datos (13 categorías, restos ocultos).

| | Antes del Worker (11 250 objetos) | Con Worker (11 250) | Con Worker y catálogo ampliado (19 520) |
| --- | --- | --- | --- |
| Arranque: JavaScript en los primeros 12 s | 0,99 s (dos veces) | 0,78 a 0,79 s | 0,75 a 0,88 s |
| Memoria del montón de JavaScript tras cargar | 59 MB | 22 a 23 MB | 24 a 29 MB |
| Reloj a 1× (% del tiempo en JavaScript) | 2,7 a 2,9 % | 2,1 % | 1,9 a 2,2 % |
| Reloj a ×10 | 16,1 a 16,2 % | 5,5 % | 5,3 a 5,6 % |
| Reloj a ×60 | 15,0 a 15,6 % | 5,0 a 5,2 % | 4,9 a 5,0 % |

Con 8 270 satélites más (+73 %), el hilo principal gasta lo mismo: el coste de añadir satélites lo paga el Worker.

Lo que no dicen estas cifras: el cálculo no desaparece, se hace en otro hilo (el Worker tarda unos 8 ms por cada muestra de 11 250 satélites en Node y 11 a 20 ms en el navegador), así que el hilo que dibuja y atiende al ratón queda libre. El modo de desarrollo de Vite carga muchos módulos sueltos, y el build de producción no está medido igual.

## Medido en Node (`npm run bench`)

Node 22 con `tsx` y el catálogo real (19 520 objetos). Cifras de tres ejecuciones; las medianas varían entre ejecuciones con la carga de la máquina.

| Qué | Cifra |
| --- | --- |
| `JSON.parse` del catálogo (2,8 MB) | 14 a 15 ms |
| Comprobar la forma de las columnas (`parseColumns`) | 4 a 5 ms |
| Construir y ordenar el catálogo | 44 a 48 ms (con `localeCompare` suelto serían más de 450 ms con 11 250 objetos) |
| Arrays para el Worker | 3 a 7 ms |
| **Total en el hilo principal al arrancar** | **≈ 70 ms** |
| `json2satrec` de todos los satélites (en el Worker) | 175 a 213 ms |
| Calcular los 19 520 satélites (`propagateBatch`, lo que hace el Worker) | **14,7 a 15,0 ms** de mediana (la primera, con la compilación, 90 a 98 ms): ≈ 0,76 µs por objeto |
| Extrapolar todas las posiciones a la hora actual | 0,26 ms |
| Elegir el satélite bajo el puntero (`pickNearest`) | 0,11 ms de mediana (p95: 0,2 a 0,25 ms) |

**Con el SATCAT (19 612 objetos, catálogo de 3,41 MB, una ejecución del 2026-11-03):** `JSON.parse` 17 ms, comprobar la forma 7 ms, construir el catálogo 43 ms, arrays para el Worker 4 ms, `json2satrec` 188 ms, `propagateBatch` 14,5 ms de mediana (la primera, 92 ms), extrapolar 0,26 ms, elegir 0,115 ms. Las columnas nuevas (propietario, tipo, estado, fecha) no cambian lo que cuesta calcular. No se han vuelto a medir en el navegador (porcentaje de JavaScript, memoria) tras añadirlas.

Antes de la fase de datos (11 250 objetos): arranque en el hilo principal ≈ 67 ms más 120 ms de `json2satrec` que ya estaban en el Worker; `propagateBatch` 8,1 ms; extrapolar 0,08 ms; elegir 0,066 ms.

Antes de la fase B, recalcular el enjambre en el hilo principal costaba de 10 a 14 ms por actualización (mediana de 9,5 a 10 ms en cuatro ejecuciones; 13,9 ms en la primera, con el navegador y el servidor abiertos).

## Medido con `?perf` (Chrome headless, renderizado por software)

| Qué | Lectura |
| --- | --- |
| CPU por dibujo | 0,3 a 0,7 ms |
| CPU por actualización de la escena | 0,3 a 0,7 ms (antes: 10 a 14 ms) |
| Llamadas de dibujo | 10 |
| Puntos | 28 521 (19 520 satélites, 9 000 estrellas y el marcador del seleccionado) |
| Latencia del Worker | 25 ms por muestra con 19 520 satélites (11 a 20 ms con 11 250) |
| Dibujos por segundo | 1 con el reloj a 1×; 14 a ×600 (limitado por el renderizado por software) |

Con el reloj en pausa, 0 dibujos en 3 s (render a demanda).

## Medido en el build y en disco

| Qué | Cifra |
| --- | --- |
| Paquete de JavaScript | **910 kB** (259 kB comprimido), más 20 kB del Worker, 57 kB del cargador Basis y 527 kB (249 kB comprimido) de WebAssembly |
| Fuentes que se descargan | ≈ 97 kB (IBM Plex Sans 400 y 600, 22 y 24 kB; Source Serif 4, 51 kB; solo el subconjunto latino) |
| Texturas | 2,6 MB (día 8K), 224 kB (día 2K), 341 kB (nubes), 101 kB (brillo del mar) |
| Catálogo de datos | 3,41 MB; 821 kB comprimido (19 612 objetos con SATCAT; ver [DATOS.md](DATOS.md)) |
| La lista de Starlink | 14 a 20 filas pintadas de 11 156 (ventana virtual) |
| Sombra de la Tierra en el shader | Con la misma hora fija, 25 960 píxeles cambian al activarla y su brillo medio baja de 89 a 55 (−38 %); todos dentro del disco del globo |

## Decisiones que salen de las medidas

- Recalcular el enjambre en el hilo principal costaba de 10 a 14 ms de los 16,7 ms de un fotograma a 60 FPS: de ahí el Worker.
- Entre dos muestras, los puntos se mueven con `posición + velocidad × tiempo` en el shader; el error de extrapolar es de menos de 0,5 km a 10 s de la muestra en la ISS (un test lo acota) y unos 16 km a 60 s, el máximo que se permite. Por eso se pide una muestra nueva cada 10 s de tiempo simulado.
- La búsqueda por texto cuesta menos de 5 ms por tecla con 11 250 objetos, así que no hace falta índice.

## Sin medir

- **FPS y tiempo de frame en una GPU real.** El entorno de pruebas usa renderizado por software (SwiftShader), que no es representativo. Toda cifra de GPU está pendiente: `?perf` mide el coste de CPU de cada dibujo, no lo que tarda la GPU.
- **Coste de la atmósfera**, que cubre todo el disco con un paso de relleno de pantalla completa.
- **Memoria de la GPU** y arranque del build de producción.
- **Móviles y GPUs integradas.**
- **El catálogo en una GPU real**: 28 521 puntos se miden solo con renderizado por software.

## Cómo repetir las medidas

- **`?perf`** en la URL (por ejemplo `http://localhost:5173/?perf`): muestra abajo a la derecha los dibujos por segundo, la CPU de cada dibujo y de cada actualización, las llamadas de dibujo, los puntos y el estado del Worker. Es la forma de medir en una GPU real.
- **`npm run data` y `npm run bench`**: arranque y cálculo en Node con los datos de `public/data/`. Conviene cerrar otros programas y repetirlo.
