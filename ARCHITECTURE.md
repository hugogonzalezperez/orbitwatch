# Arquitectura

Estado a 2026-11-01. Lo marcado como *pendiente* no existe todavía.

## Flujo de datos (objetivo)

No hay backend. Solo una GitHub Action habla con CelesTrak; el navegador nunca lo hace.

```
CelesTrak ──(cada 2 h, 1 petición por grupo)──> GitHub Action (pendiente)
                                                  │ valida (HTTP 200, esquema, nº de objetos)
                                                  │ reduce a los campos que SGP4 necesita
                                                  ▼
                                   data/<grupo>.json + manifest.json
                                                  │ publicados como ficheros estáticos (GitHub Pages)
                                                  ▼
Navegador: fetch manifest → fetch grupos → Web Worker
   Worker: json2satrec + SGP4 por lotes → Float32Array (posición + velocidad)
   Hilo principal: sube el buffer a la GPU (transferible, sin copia)
   Vertex shader: interpola entre instantáneas → dibuja
   React: solo recibe metadatos (nº de objetos, selección), nunca datos por frame
```

- **Fuente:** API GP de CelesTrak en OMM JSON. Hay que pedir `FORMAT=json` explícitamente (CSV es el predeterminado desde 2026-05-09). TLE queda descartado: desde 2026-07-11 hay números de catálogo de 6 dígitos.
- **Política de CelesTrak:** los datos se actualizan cada 2 h y hay que descargar una vez por actualización. Ante cualquier respuesta distinta de HTTP 200, parar de inmediato. Por eso existe la capa intermedia.
- **Alojamiento:** GitHub Pages, mismo origen para web y datos (sin CORS). La Action despliega web y datos juntos como artefacto, sin commits cada 2 h. Cloudflare solo si el ancho de banda o las cabeceras lo exigen.

## Frescura de los datos (pendiente)

- **Del conjunto:** `manifest.json` guarda cuándo lo generó la Action. La web compara con la hora actual: hasta ~3 h normal, 3–6 h aviso amarillo, más de 6 h aviso rojo (umbrales propuestos, ajustables). Siempre se muestra "datos de hace X h". Si falla la red, se usa la copia en caché con su edad visible.
- **De cada objeto:** cada elemento OMM trae su época; la edad se muestra en la ficha, con escala de colores como la columna "GP Age (days)" de CelesTrak. Propagar lejos de la época aumenta el error.

## La Tierra

- **Decisión (opción A):** esfera de 128×64 segmentos con texturas, no un motor de teselas. Zoom limitado: cerca ≈ 2 000 km sobre la superficie, lejos ≈ 60 000 km (en `src/scene/config.ts`).
- **Por qué:** una textura 8K da ≈4,9 km/píxel y queda nítida hasta ≈6 400 km de distancia (estimación: FOV 45°, pantalla de 1080 px). Más cerca se ve borrosa. No llega a nivel de calle como Google Earth; si se necesitara, la opción C añadiría teselas solo al acercarse.
- **Texturas:** Solar System Scope (CC BY 4.0; el crédito sale en pantalla), convertidas a KTX2 con `scripts/build-textures.sh` (ETC1S, mipmaps incluidos). Día 8K ≈ 2,6 MB (menos que el JPEG original, 4,5 MB) y se queda comprimido en la GPU; UASTC pesaba 13 MB. Specular (brillo del mar) y nubes a 2K, un solo canal. Sin mapa normal ni de noche por ahora.
- **Carga progresiva:** primero el día 2K (≈220 kB) para pintar rápido, luego el specular y por último el 8K, que sustituye al 2K. Si una carga falla queda el azul liso y el error en consola.
- **Nubes:** segunda esfera (radio 1,002 ≈ 13 km) con una textura de un canal como opacidad. Es una foto fija, no el tiempo real. Su malla es de 128×64 porque con menos caras el centro de cada cara se hunde bajo la Tierra y salen rombos (lo cubre un test). Se desactivan con `CLOUDS_ENABLED`.
- **Unidad de escena:** 1 = un radio terrestre (6 371 km). Mantiene la precisión de float32.

## Tiempo y marco de referencia

- **Escena inercial (ECI):** la cámara está fija en el espacio; la Tierra gira dentro de la escena según su ángulo sidéreo (GMST) y los satélites se mueven en el mismo marco que SGP4 (TEME). Eje Y arriba: `temeToScene` hace (x, y, z) → (x, z, −y) y es la misma convención que la rejilla y la textura. Un test comprueba que la longitud geodésica de la ISS coincide con la de la escena menos el giro de la Tierra.
- **Reloj (`app/clock.ts`):** hora simulada = hora real × velocidad, con velocidades negativas, pausa, salto y `resetToNow()` (vuelve a la hora del equipo, a 1x y sin pausa). Cambiar de velocidad no da saltos. `?t=2026-03-20T14:46:00Z` arranca en esa hora y en pausa (verificación y demostraciones).
- **Cuándo se dibuja:** a 1x o en pausa, una vez por segundo o nunca; por encima de 1x, en cada fotograma. El reloj avisa de cambios de estado, no del paso del tiempo.
- **Lo que ya se ve:** la ISS (grupo `stations`) y un enjambre de ~11 200 puntos, Starlink y meteorología, de los ficheros que baja `npm run data` (sin Action todavía). El enjambre solo tiene posición y color de grupo: sin selección, panel ni sombra de la Tierra. Calcularlo entero cuesta ~14 ms (medido en Node con 11 230 objetos), así que con el reloj acelerado se recalcula cada 100 ms, no cada fotograma. La interfaz muestra la distancia entre la hora simulada y la época de los elementos, y avisa de que la precisión baja (a partir de 3 días de distancia aviso, desde 7 poco fiable).
- **El Sol:** `shared/sun.ts` da la dirección real del Sol (`sunPos` de satellite.js, error ≤ 0,008° frente a astronomy-engine en ocho fechas de 2025 a 2030) en el mismo marco que los satélites. Con ella `globe/lighting.ts` orienta la luz en cada actualización: el terminador y el brillo del mar son los de la hora simulada. `globe/sunDisc.ts` dibuja el disco con su tamaño angular real (0,53°), en esa dirección y a distancia infinita: el shader usa solo la rotación de la vista y fuerza la profundidad al fondo, así que no hay paralaje al orbitar y la Tierra lo tapa si está delante. El relleno ambiente (0,15) es una licencia artística: sin él el lado de noche sería negro puro.
- **Estrellas (`scene/starfield.ts`):** 9 000 puntos en un solo dibujo, con la misma técnica que el Sol (infinito, sin paralaje, tapados por la Tierra) y fijos en el marco inercial, como el Sol: giran con la cámara. Son aleatorios con semilla fija, no un catálogo real, pero el 45 % se concentra en la banda de la Vía Láctea, en su orientación real (polo galáctico en AR 192,86°, Dec 27,13°). Tenues y poco saturados: el color intenso queda para los datos.
- **Atmósfera (`globe/atmosphere.ts`):** velo azul claro que se funde sobre el borde del disco, con poco brillo por fuera, como en Google Earth. Una capa de radio 1,03 (≈ 190 km, el doble de la altura visible real; por debajo de la ISS) con sus caras delanteras. El brillo es la longitud del camino de la vista dentro de la capa, hasta el suelo si lo toca, calculada con la geometría exacta del rayo con las dos esferas: mínimo mirando hacia abajo, máximo en el borde y nulo en el límite exterior. Sobre el disco crece con exponente 1,2 y por fuera cae con 2,6 (en el borde ambos valen 1). Sigue al Sol (nada en el lado de noche) y no tiene tono crepuscular. Cubre todo el disco, así que añade un paso de relleno de pantalla completa de la Tierra: no se ha medido en una GPU real.
- **Sombra de la Tierra:** `stateAt` calcula `sunlight` con `shadowFraction` (incluye penumbra): 1 al sol, 0 en la sombra. El panel lo dice con texto y el punto de la ISS se atenúa a la mitad en la sombra.
- **Selección y panel:** pulsar sobre la ISS (comprobación de pantalla y de oclusión en `scene/picking.ts`) la selecciona; `Engine.selection` es un `Store` que React lee. Con la ISS seleccionada se calcula la vuelta actual (`propagation/orbit.ts`: de un cruce ascendente del ecuador al siguiente) y se dibuja con dos líneas que comparten vértices (`render/orbitLine.ts`).
- **Datos y época:** `public/data/manifest.json` guarda cuándo se descargaron (distinto de la época de los elementos); el panel muestra las dos y avisa cuando envejecen.
- **Verificado:** la posición calculada coincide a 0,2 km con la API pública wheretheiss.at en el mismo instante (ambas parten de los mismos elementos, así que comprueba las conversiones, no la física de SGP4).

## Rendimiento

Hecho: límite de `devicePixelRatio` a 2, planos near/far dinámicos, render solo cuando algo cambia (cámara, tamaño o textura nueva; quien cambie la escena llama a `invalidate`), `requestAnimationFrame` (el navegador lo pausa con la pestaña oculta), texturas comprimidas en GPU, Phong en vez de PBR, liberación de recursos al desmontar. Medido en Chrome headless: 0 renders en 3 s con el reloj en pausa y 1 por segundo a 1x; 7 llamadas de dibujo sin selección (estrellas, Tierra, rejilla, nubes, atmósfera, Sol, ISS) y 9 con la ISS seleccionada (más las dos líneas de la órbita). Sin medir en una GPU real.

Pendiente: una sola `THREE.Points` para todos los satélites, SGP4 en Web Worker con interpolación en el shader, órbita solo del objeto seleccionado, selección con índice espacial, calidad adaptativa por tiempo de frame, cribado de acercamientos en cascada (altitud, rejilla espacial, refinado).

## Estructura

```
src/
  app/          engine.ts (compone las piezas y devuelve el Engine), clock.ts, startTime.ts
  scene/        infraestructura 3D común: config.ts (zoom, cámara, píxeles), renderer, camera, clipPlanes, picking, starfield,
                controls, space, renderLoop (dibuja solo si algo cambia), viewport (tamaño), disposeScene
  globe/        lo propio de la Tierra: config.ts (radios, caras, texturas), earth, clouds, graticule,
                lighting (luz del Sol real), sunDisc, atmosphere, textureSource (carga KTX2), createGlobe (giro por GMST)
  satellites/   data/ (omm: validación de registros; fetchGroups: descarga que respeta la política de CelesTrak; groups: grupos que se bajan; manifest; freshness: edad de la época), propagation/swarm.ts (miles de satélites a la vez),
                propagation/ (position: SGP4 → escena y geodésicas; orbit: vuelta actual), render/ (satellitePoints, orbitLine),
                createSatellites,
                config; conjunctions/ [pendiente]
  ui/           React: App, GlobeCanvas (aloja el canvas), ClockPanel (abajo), IssPanel (lateral), hooks, format, icons
  shared/       units, frames (TEME ↔ escena), sun (dirección del Sol), store (puente motor → React)
scripts/        build-textures.sh, update-data.ts (`npm run data`); descarga automática con Action [pendiente]
public/         data/ (generado por `npm run data`, no se versiona), textures/earth/ (KTX2)
tests/          espeja src/; datos reales de CelesTrak en tests/fixtures
.github/workflows/  refresco de datos y despliegue [pendiente]
```

Dependencias, sin ciclos: `ui` → `app` → `scene`, `globe` y `satellites` → `shared`. Esas tres capas no se conocen entre sí; las junta `app`. El motor 3D es imperativo y expone un `Engine` (reloj, estado de la ISS como `Store`, `focusIss`); React se suscribe con `useSyncExternalStore`.

## Decisiones

- three.js directo, no CesiumJS: más ligero y el valor del proyecto es controlar el rendimiento y los shaders.
- React solo para paneles; el motor 3D es imperativo y no pasa por el estado de React.
- Aviso honesto en la interfaz: con elementos públicos el error de posición es de kilómetros. El cribado encuentra candidatos, no predice colisiones.
- Sin medir no se afirma: los números de rendimiento se publicarán tras medir en equipos reales.
