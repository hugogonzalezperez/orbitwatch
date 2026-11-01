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

## Rendimiento

Hecho: límite de `devicePixelRatio` a 2, planos near/far dinámicos, render solo cuando algo cambia (cámara, tamaño o textura nueva; quien cambie la escena llama a `invalidate`), `requestAnimationFrame` (el navegador lo pausa con la pestaña oculta), texturas comprimidas en GPU, Phong en vez de PBR, liberación de recursos al desmontar. Medido en Chrome headless: 0 renders en 3 s en reposo, 3 llamadas de dibujo y 32 256 triángulos. Sin medir en una GPU real.

Pendiente: una sola `THREE.Points` para todos los satélites, SGP4 en Web Worker con interpolación en el shader, órbita solo del objeto seleccionado, selección con índice espacial, calidad adaptativa por tiempo de frame, cribado de acercamientos en cascada (altitud, rejilla espacial, refinado).

## Estructura

```
src/
  app/          engine.ts: compone las piezas y devuelve el dispose
  scene/        infraestructura 3D común: config.ts (zoom, cámara, píxeles), renderer, camera, clipPlanes,
                controls, space, renderLoop (dibuja solo si algo cambia), viewport (tamaño), disposeScene
  globe/        lo propio de la Tierra: config.ts (radios, caras, texturas), earth, clouds, graticule,
                lighting, textureSource (carga KTX2), createGlobe
  satellites/   data/ (carga, frescura), propagation/ (worker SGP4), conjunctions/ (cribado)  [pendiente]
  ui/           React: App, GlobeCanvas (aloja el canvas), paneles [pendiente]
  shared/       units.ts, geometry.ts (matemática sin three ni DOM)
scripts/        build-textures.sh (descarga y conversión a KTX2); descarga de CelesTrak [pendiente]
public/         data/ (JSON generados), textures/earth/ (KTX2)
tests/          espeja src/: Vitest sobre lógica pura y el bucle de render con falsos mínimos
.github/workflows/  refresco de datos y despliegue [pendiente]
```

Dependencias, sin ciclos: `ui` → `app` → `scene` y `globe` → `shared`. `scene` y `globe` no se conocen entre sí; los datos de satélites entrarán por `app`.

## Decisiones

- three.js directo, no CesiumJS: más ligero y el valor del proyecto es controlar el rendimiento y los shaders.
- React solo para paneles; el motor 3D es imperativo y no pasa por el estado de React.
- Aviso honesto en la interfaz: con elementos públicos el error de posición es de kilómetros. El cribado encuentra candidatos, no predice colisiones.
- Sin medir no se afirma: los números de rendimiento se publicarán tras medir en equipos reales.
