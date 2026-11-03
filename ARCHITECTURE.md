# Arquitectura

Cómo encajan las piezas hoy. El porqué de cada decisión, con sus alternativas, está en [docs/DECISIONES.md](docs/DECISIONES.md); los datos, en [docs/DATOS.md](docs/DATOS.md); las cifras de rendimiento, en [docs/RENDIMIENTO.md](docs/RENDIMIENTO.md). Lo marcado como *pendiente* no existe todavía.

## Flujo de datos

No hay backend. Solo un proceso fuera del navegador habla con CelesTrak; el navegador nunca lo hace.

```
CelesTrak ──(20 grupos, 1 petición cada uno, ≤ 1 vez cada 2 h, con caché local)──> npm run data  (y la Action programada)
                                                         │ valida (HTTP 200, esquema, nº de objetos)
                                                         │ une, deduplica y clasifica por función
                                                         ▼
                                   public/data/catalog.<hash>.json (por columnas) + manifest.json
                                                         │ ficheros estáticos
                                                         ▼
Navegador: manifest → catálogo (comprueba el hash) → columnas → lista del buscador y de la leyenda (hilo principal)
   Worker: SGP4 de todos los satélites cada 10 s de tiempo simulado → posiciones + velocidades (transferidas)
   Shader: posición + velocidad × tiempo, sombra de la Tierra → una sola llamada de dibujo
   Seleccionado: registro reconstruido de su fila + estado completo (altitud, velocidad, sombra) + vuelta actual
   React: recibe metadatos (catálogo, seleccionado), nunca datos por fotograma
```

- **Fuente:** API GP de CelesTrak en OMM JSON (`FORMAT=json`). TLE queda descartado: hay números de catálogo de 6 dígitos. Grupos, categorías y tamaños en [docs/DATOS.md](docs/DATOS.md).
- **Política de CelesTrak:** actualiza cada 2 h; una descarga por actualización; parar ante cualquier respuesta distinta de 200. Por eso existe la capa estática intermedia.
- **Frescura:** `manifest.json` guarda cuándo se descargaron (no es la época de cada objeto). La ficha resume en una frase el peor aviso entre la edad de la descarga (3 h aviso, 6 h desactualizado) y la distancia entre la hora simulada y la época (3 días la precisión baja, 7 poco fiable). Pendiente: copia del último conjunto válido si CelesTrak falla.
- **Alojamiento:** GitHub Pages con el repositorio público; una Action refresca los datos cada 2 h y despliega ([docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)).

## Tiempo y marco de referencia

- **Escena inercial (ECI):** la cámara está fija en el espacio; la Tierra gira dentro de la escena según su ángulo sidéreo (GMST) y los satélites se mueven en el mismo marco que SGP4 (TEME). Eje Y arriba: `temeToScene` hace (x, y, z) → (x, z, −y), igual que la rejilla y la textura. 1 unidad de escena = un radio terrestre (6 371 km).
- **Reloj (`app/clock.ts`):** hora simulada = hora real × velocidad, con velocidades negativas, pausa, salto y `resetToNow()` (vuelve a la hora del equipo, a 1× y sin pausa). Cambiar de velocidad no da saltos. `?t=2026-03-20T14:46:00Z` arranca en esa hora y en pausa. La hora sale siempre del reloj, nunca de `Date.now()` directamente en el motor.
- **Cuándo se dibuja:** a 1× o en pausa, la escena se recalcula una vez por segundo o nunca; por encima de 1×, en cada fotograma. El reloj avisa de cambios de estado, no del paso del tiempo.

## La Tierra y el cielo

- **Tierra (`globe/earth.ts`):** esfera de 128×64 segmentos con textura de día en KTX2 (8K, con una de 2K que se pinta antes). Zoom entre ≈ 2 000 y ≈ 120 000 km sobre la superficie (`scene/config.ts`).
- **Texturas:** Solar System Scope (CC BY 4.0, el crédito sale en pantalla), convertidas con `scripts/build-textures.sh` (ETC1S, mipmaps incluidos). Día 8K ≈ 2,6 MB; brillo del mar y nubes a 2K y un canal. Carga progresiva: día 2K → brillo → día 8K. Si una carga falla queda el azul liso y el error en consola. Sin mapa de noche ni de relieve por ahora.
- **Nubes (`globe/clouds.ts`):** segunda esfera de radio 1,002 con una textura de un canal como opacidad. Foto fija, no el tiempo real. Se desactivan con `CLOUDS_ENABLED`.
- **Rejilla (`globe/graticule.ts`):** paralelos y meridianos cada 15° para percibir el giro y el volumen.
- **Sol (`shared/sun.ts`, `globe/lighting.ts`, `globe/sunDisc.ts`):** dirección real del Sol con `sunPos` de satellite.js, en el mismo marco que los satélites. La luz direccional la usa para el terminador y el brillo del mar; el disco se dibuja en el infinito con su tamaño angular real (0,53°) y la Tierra lo tapa si está delante. Luz ambiente 0,15, una licencia artística.
- **Atmósfera (`globe/atmosphere.ts`):** velo azul claro sobre el borde, que sigue al Sol y se funde hacia fuera. Capa de radio 1,03; el brillo es la longitud del camino de la vista dentro de la capa, con la geometría exacta del rayo con las dos esferas.
- **Estrellas (`scene/starfield.ts`):** 9 000 puntos aleatorios con semilla, con brillo y tono variables, en el infinito y orientados en el marco inercial. No son las de un catálogo.
- **Objetos «en el infinito»:** el Sol y las estrellas usan solo la rotación de la vista (`mat3(viewMatrix)`) y fuerzan la profundidad al fondo (`gl_Position.xyww`). Orientar un objeto de cielo a la cámara se hace en el shader, no en `onBeforeRender` (iría un fotograma tarde con render a demanda).

## Satélites

- **Catálogo y categorías (`satellites/catalog.ts`, `categories.ts`, `data/columns.ts`, `data/assemble.ts`):** el catálogo llega por columnas con la categoría ya asignada por el script (`assembleCatalog`: un objeto por número NORAD, la categoría de mayor prioridad entre sus grupos de CelesTrak). `buildCatalog` crea una entrada por satélite (nombre, número, categoría, clave de búsqueda) ordenada por categoría y nombre; los registros completos solo se reconstruyen para el elegido (`recordAt`). Cada categoría tiene nombre, tipo («Satélite meteorológico»), color, opacidad y si parte oculta (los restos).
- **Enjambre (`propagation/swarm.ts`, `render/swarmPoints.ts`):** un hueco fijo por satélite en buffers de tamaño fijo y un único `THREE.Points`. `createSwarm` recibe las columnas y un estilo por categoría, y pide al Worker una muestra (`Sample`: posiciones y velocidades en radios terrestres, y qué satélites SGP4 pudo calcular) cuando la hora simulada se aleja 10 s de la vigente (`needsRefresh`), con una petición a la vez. El vertex shader mueve cada punto con `posición + velocidad × tiempo` (el tiempo se acota a ±60 s con `extrapolationSeconds`), oscurece lo que cae en la sombra cilíndrica de la Tierra y no dibuja lo inválido ni lo de opacidad 0 (categorías ocultas). Los colores y opacidades (categoría, resaltado de la búsqueda, ocultos) viven en un buffer que solo se vuelve a subir cuando cambian (`colorsVersion`).
- **Worker (`propagation/propagation.worker.ts`, `batch.ts`, `transport.ts`, `protocol.ts`):** `batch.ts` es el cálculo puro (`createBatch` a partir de un `OrbitInput` de arrays tipados, `propagateBatch`); el Worker lo ejecuta y devuelve los buffers transferidos, sin copiarlos. `transport.ts` elige entre el Worker y el mismo cálculo en el hilo principal si el navegador no lo permite o falla al arrancar.
- **Seleccionado (`createSatellites.ts`, `propagation/position.ts`):** estado completo con `stateAt` (posición, geodésicas, velocidad, sombra de la Tierra) y un marcador grande (`render/satellitePoints.ts`). Los datos que no son un número de los elementos se derivan en `satellites/orbitInfo.ts`: periodo, perigeo, apogeo y tipo de órbita (baja < 2 000 km de altura media, media, geosíncrona si el periodo es un día ±2 %, elíptica si la excentricidad es ≥ 0,25, alta por encima).
- **Órbita (`propagation/orbit.ts`, `render/orbitLine.ts`):** la vuelta que contiene la hora mostrada, de un cruce ascendente del ecuador al siguiente; para las que no cruzan el ecuador o tardan más de 150 min (geoestacionarias, GPS), una vuelta de un periodo desde la época. Dos líneas que comparten vértices (lo recorrido, continua; lo que falta, discontinua) con 600 puntos por vuelta.
- **Búsqueda:** `searchEntries` (sin tildes, todas las palabras, por nombre, número NORAD o designador) y `rankResults` (el número exacto primero, luego los nombres que empiezan por lo escrito). El globo atenúa lo que no coincide mediante la opacidad del atributo de color; con 500 coincidencias o menos, esas se agrandan.

## Selección, cámara y encuadre

- **Elegir (`Engine.select`, por número NORAD):** pulsando un punto del globo (`pickNearest` en `scene/picking.ts`: el más cercano al puntero dentro de 10 px, ignorando los que tapa la Tierra o quedan detrás de la cámara), en la leyenda o con el buscador. Un arrastre de más de 5 px es girar, no pulsar. La ISS se elige sola al cargar si el usuario no ha tocado nada.
- **Vuelo de cámara (`scene/flight.ts`):** al elegir, la dirección gira por el camino corto y la distancia se interpola en escala logarítmica en 0,7 s, con salida rápida y frenada suave. Coger los mandos lo cancela; con «reducir movimiento» salta sin animar.
- **Encuadre (`scene/framing.ts`):** `framingDistance` calcula la distancia a la que cabe la órbita entera contando la perspectiva (el punto más cercano a la cámara es el que más se abre) y `focusDirection` elige el lado de la inclinación (35° fuera del plano de la órbita, para no verla de canto) que deja al satélite en la mitad superior de la pantalla.
- **Que se vean todos:** con los datos reales, 23 de los 74 meteorológicos son geoestacionarios (6,6 radios del centro) y el apogeo máximo es 7,22. Por eso el plano lejano de la cámara llega a `distancia + MAX_ORBIT_RADIUS` (12) y no a `+ 1`, y el zoom llega a 19,8 unidades. La cámara no descuenta que la ficha y la columna tapen parte del lienzo.

## Interfaz (React)

React solo aloja el canvas y los paneles. El motor 3D es imperativo (`app/engine.ts`) y expone un `Engine` (reloj, estado de los datos y del seleccionado como `Store`, `select`, `focusSelected`, `setHighlight`, `setHiddenCategories`); React se suscribe con `useSyncExternalStore`. Diseño visual en [DESIGN.md](DESIGN.md).

- `ui/App.tsx` (nombre y línea viva), `Search`, `Legend` (categorías con interruptor; listas con `VirtualList`, de ventana virtual: filas de 40 px y solo se pintan las visibles), `SelectedCard` con `Rulers` (reglas de altitud y de vuelta), `ClockPanel`, `reliability` (frase de fiabilidad de los datos).
- Las etiquetas del seleccionado y de lo que hay bajo el puntero (`app/labels.ts`) son DOM imperativo, no React, porque se recolocan en cada fotograma.

## Rendimiento

Hecho: límite de `devicePixelRatio` a 2, planos near/far dinámicos, render solo cuando algo cambia (cámara, tamaño o textura nueva; quien cambie la escena llama a `invalidate`), `requestAnimationFrame` (el navegador lo pausa con la pestaña oculta), texturas comprimidas en GPU, Phong en vez de PBR, una sola llamada de dibujo para el enjambre, cálculo de los satélites en un Worker, buffers de tamaño fijo, liberación de recursos al desmontar. `?perf` muestra métricas en pantalla (`app/perf.ts`, `app/perfHud.ts`). Las cifras, con su método, y lo que no está medido, en [docs/RENDIMIENTO.md](docs/RENDIMIENTO.md).

Pendiente: calidad adaptativa por tiempo de frame, cribado de acercamientos en cascada (altitud, rejilla espacial, refinado).

## Estructura

```
src/
  app/          engine.ts (compone las piezas y devuelve el Engine), clock.ts, startTime.ts, labels.ts, perf.ts, perfHud.ts
  scene/        infraestructura 3D común: config (zoom, cámara, píxeles), renderer, camera, clipPlanes, picking,
                flight, framing, starfield, controls, space, renderLoop (dibuja solo si algo cambia), viewport, disposeScene
  globe/        lo propio de la Tierra: config (radios, caras, texturas), earth, clouds, graticule, lighting,
                sunDisc, atmosphere, textureSource (carga KTX2), createGlobe (giro por GMST)
  satellites/   data/ (omm: validación de registros; fetchGroups: descarga que respeta la política de CelesTrak;
                groups; manifest; columns: catálogo por columnas; assemble: unir y clasificar; freshness: edad de la época), propagation/ (position, orbit, batch, swarm, transport,
                protocol, propagation.worker),
                render/ (satellitePoints, swarmPoints, orbitLine), catalog, categories, orbitInfo,
                createSatellites, config; conjunctions/ [pendiente]
  ui/           React: App, GlobeCanvas, Search, Legend, VirtualList, virtual, SelectedCard, Rulers, ClockPanel,
                reliability, hooks, format, icons
  shared/       units, frames (TEME ↔ escena), sun (dirección del Sol), store (puente motor → React)
scripts/        build-textures.sh, update-data.ts (`npm run data`), cachedFetch.ts (caché local de 2 h), restoreData.ts y
                restore-data.ts (`npm run data:restore`), ci-data.sh, bench.ts (`npm run bench`)
public/         data/ (generado por `npm run data`, no se versiona), textures/earth/ (KTX2)
tests/          espeja src/; datos reales de CelesTrak en tests/fixtures
docs/           DECISIONES, DATOS, RENDIMIENTO, CONVENCIONES
.github/workflows/  despliegue y refresco de datos cada 2 h
```

Dependencias, sin ciclos: `ui` → `app` → `scene`, `globe` y `satellites` → `shared`. Esas tres capas no se conocen entre sí; las junta `app`.

## Verificado

- La posición calculada de la ISS coincide a 0,2 km con la API pública wheretheiss.at en el mismo instante (ambas parten de los mismos elementos, así que comprueba las conversiones, no la física de SGP4).
- La posición del Sol coincide con astronomy-engine con un error máximo de 0,0077° en ocho fechas de 2025 a 2030.
- Un test comprueba que la longitud geodésica de un satélite coincide con la de la escena menos el giro de la Tierra (mismo marco que la textura).
