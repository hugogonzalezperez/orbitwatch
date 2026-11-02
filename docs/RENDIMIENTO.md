# Rendimiento: qué está medido y qué no

El proyecto no afirma rendimiento sin medirlo. Esta página separa las cifras medidas, con su método, de lo que sigue sin medir. Para medir en tu equipo, añade `?perf` a la URL (ver más abajo) o ejecuta `npm run bench`.

## Medido en el navegador: antes y después del Worker

Cuánto tiempo pasa el hilo principal ejecutando JavaScript. Método: Chrome headless con renderizado por software, servidor de desarrollo de Vite, métricas `Performance.getMetrics` del protocolo de Chrome (`ScriptDuration` y `TaskDuration`), ventanas de 10 s con el reloj en cada velocidad, **dos ejecuciones por lado**. «Antes» es el commit anterior a pasar el cálculo al Worker.

| | Antes | Después |
| --- | --- | --- |
| Arranque: JavaScript en los primeros 12 s | 0,99 s (dos veces) | 0,78 a 0,79 s |
| Memoria del montón de JavaScript tras cargar | 59 MB | 22 a 23 MB |
| Reloj a 1× (% del tiempo en JavaScript) | 2,7 a 2,9 % | 2,1 % |
| Reloj a ×10 | 16,1 a 16,2 % | 5,5 % |
| Reloj a ×60 | 15,0 a 15,6 % | 5,0 a 5,2 % |

Lo que no dicen estas cifras: el cálculo no desaparece, se hace en otro hilo (el Worker tarda unos 8 ms por cada muestra de 11 250 satélites en Node y 11 a 20 ms en el navegador), así que el hilo que dibuja y atiende al ratón queda libre. El modo de desarrollo de Vite carga muchos módulos sueltos, y el build de producción no está medido igual.

## Medido en Node (`npm run bench`)

Node 22 con `tsx` y los datos reales (11 250 objetos). Cifras de cuatro ejecuciones; las medianas varían entre ejecuciones con la carga de la máquina.

| Qué | Cifra |
| --- | --- |
| `JSON.parse` de los ficheros de datos | 14 ms |
| Validar los 11 250 registros | 19 ms |
| Construir y ordenar el catálogo | 34 ms (antes, con `localeCompare`: 450 ms) |
| `json2satrec` de todos los satélites (ahora en el Worker) | 120 ms (antes, en el hilo principal) |
| Calcular los 11 250 satélites (`propagateBatch`, lo que hace el Worker) | **8,1 ms** de mediana (la primera, con la compilación, 60 ms) |
| Extrapolar todas las posiciones a la hora actual | 0,08 ms |
| Elegir el satélite bajo el puntero (`pickNearest`) | 0,066 ms de mediana (p95: 0,13 a 0,17 ms) |

Antes de la fase B, recalcular el enjambre en el hilo principal costaba de 10 a 14 ms por actualización (mediana de 9,5 a 10 ms en cuatro ejecuciones; 13,9 ms en la primera, con el navegador y el servidor abiertos).

## Medido con `?perf` (Chrome headless, renderizado por software)

| Qué | Lectura |
| --- | --- |
| CPU por dibujo | 0,3 a 0,7 ms |
| CPU por actualización de la escena | 0,3 a 0,7 ms (antes: 10 a 14 ms) |
| Llamadas de dibujo | 10 |
| Puntos | 20 251 (11 250 satélites, 9 000 estrellas y el marcador del seleccionado) |
| Latencia del Worker | 11 a 20 ms por muestra |
| Dibujos por segundo | 1 con el reloj a 1×; 14 a ×600 (limitado por el renderizado por software) |

Con el reloj en pausa, 0 dibujos en 3 s (render a demanda).

## Medido en el build y en disco

| Qué | Cifra |
| --- | --- |
| Paquete de JavaScript | **910 kB** (259 kB comprimido), más 20 kB del Worker, 57 kB del cargador Basis y 527 kB (249 kB comprimido) de WebAssembly |
| Fuentes que se descargan | ≈ 97 kB (IBM Plex Sans 400 y 600, 22 y 24 kB; Source Serif 4, 51 kB; solo el subconjunto latino) |
| Texturas | 2,6 MB (día 8K), 224 kB (día 2K), 341 kB (nubes), 101 kB (brillo del mar) |
| Datos de Starlink | 3,7 MB; 594 kB comprimido (ver [DATOS.md](DATOS.md)) |
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
- **Los 16 847 objetos de `active` o más:** el cálculo en el Worker con ese tamaño se estima (≈ 0,7 µs por objeto), no se ha medido.

## Cómo repetir las medidas

- **`?perf`** en la URL (por ejemplo `http://localhost:5173/?perf`): muestra abajo a la derecha los dibujos por segundo, la CPU de cada dibujo y de cada actualización, las llamadas de dibujo, los puntos y el estado del Worker. Es la forma de medir en una GPU real.
- **`npm run data` y `npm run bench`**: arranque y cálculo en Node con los datos de `public/data/`. Conviene cerrar otros programas y repetirlo.
