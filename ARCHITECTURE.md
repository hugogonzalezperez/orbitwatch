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

- **Decisión (opción A):** esfera de 128×64 segmentos con texturas, no un motor de teselas. Zoom limitado: cerca ≈ 2 000 km sobre la superficie, lejos ≈ 60 000 km (en `src/app/config.ts`).
- **Por qué:** una textura 8K da ≈4,9 km/píxel y queda nítida hasta ≈6 400 km de distancia (estimación: FOV 45°, pantalla de 1080 px). Más cerca se ve borrosa. No llega a nivel de calle como Google Earth; si se necesitara, la opción C añadiría teselas solo al acercarse.
- **Texturas (pendiente):** Solar System Scope (CC BY 4.0, con atribución visible), convertidas a KTX2; 2K al arrancar y mejora bajo demanda.
- **Unidad de escena:** 1 = un radio terrestre (6 371 km). Mantiene la precisión de float32.

## Rendimiento

Hecho: límite de `devicePixelRatio` a 2, planos near/far dinámicos, `requestAnimationFrame` (el navegador lo pausa con la pestaña oculta), liberación de recursos al desmontar.

Pendiente: una sola `THREE.Points` para todos los satélites, SGP4 en Web Worker con interpolación en el shader, órbita solo del objeto seleccionado, selección con índice espacial, calidad adaptativa por tiempo de frame, cribado de acercamientos en cascada (altitud, rejilla espacial, refinado).

## Estructura

```
src/
  app/          config.ts (constantes), engine.ts (arranque, bucle, dispose)
  scene/        renderer, camera, clipPlanes, controls, space (infraestructura 3D común)
  globe/        earth, graticule, lighting, createGlobe (lo propio de la Tierra)
  satellites/   data/ (carga, frescura), propagation/ (worker SGP4), conjunctions/ (cribado)  [pendiente]
  ui/           React: App, GlobeCanvas (aloja el canvas), paneles [pendiente]
  shared/       units.ts
scripts/        herramientas de build: descarga de CelesTrak, conversión a KTX2 [pendiente]
public/         data/ (JSON generados), textures/earth/
tests/          Vitest sobre lógica pura (unidades, zoom, planos de recorte, rejilla)
.github/workflows/  refresco de datos y despliegue [pendiente]
```

## Decisiones

- three.js directo, no CesiumJS: más ligero y el valor del proyecto es controlar el rendimiento y los shaders.
- React solo para paneles; el motor 3D es imperativo y no pasa por el estado de React.
- Aviso honesto en la interfaz: con elementos públicos el error de posición es de kilómetros. El cribado encuentra candidatos, no predice colisiones.
- Sin medir no se afirma: los números de rendimiento se publicarán tras medir en equipos reales.
