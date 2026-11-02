# Convenciones y lecciones del proyecto

Reglas que conviene respetar al tocar el código, y los problemas reales que las motivaron. Cada una de las lecciones costó encontrarla; el motivo está para no repetirlo.

## Reglas

**Escena y tiempo**
- 1 unidad de escena = 1 radio terrestre (6 371 km). Las constantes de cámara y zoom están en `src/scene/config.ts`; las del globo (radios, caras, texturas), en `src/globe/config.ts`.
- La escena es inercial: cámara fija, la Tierra gira por GMST (`globe.update`) y los satélites usan `temeToScene`. La hora sale siempre de `Clock`, nunca de `Date.now()` directamente.
- La luz sale de `sunDirectionScene(date)`.
- El Sol y las estrellas están en el infinito: su shader usa `mat3(viewMatrix)` y `.xyww`. Un objeto de cielo que se orienta a la cámara se hace en el shader, no en `onBeforeRender`.

**Render**
- Se renderiza solo cuando algo cambia. Al modificar la escena fuera de la cámara, hay que llamar a `invalidate()` (`scene/renderLoop.ts`); si no, no se verá. Las texturas ya lo hacen solas al cargar.
- Geometría que cambia con el tiempo: reescribir buffers de tamaño fijo, nunca sustituir atributos. Ejemplo: `satellites/render/orbitLine.ts`.
- Al tocar texturas o UV, comprobar en pantalla la orientación: norte arriba, las Américas a la izquierda de África.
- Texturas en KTX2 con `scripts/build-textures.sh`; no añadir JPG o PNG grandes a `public/`.
- `satellite.js` reexporta un módulo WebAssembly con workers: `vite.config.ts` fija `worker.format: 'es'` para que el build no falle. Si se actualiza, repetir `npm run build`.

**Satélites y cámara**
- Los satélites lejanos (geoestacionarios a 6,6 radios, elípticas a 7,3) tienen que verse: el plano lejano llega a `MAX_ORBIT_RADIUS`, el zoom a 120 000 km y `framingDistance` aleja la cámara al elegirlos. Al cambiar el campo de visión, la inclinación o los límites del zoom, comprobar con un geoestacionario (por ejemplo, GOES 16) que el satélite, su etiqueta y su órbita caben en pantalla.
- Al centrar la cámara en un satélite, comprobar la orientación: en el plano de la órbita, la elipse se ve de canto.
- Las listas de la leyenda son virtuales (`VirtualList`): la altura de fila vive en `ROW_HEIGHT` y en `.vlist-row` y `.legend-sat` del CSS, y hay que tocarlas a la vez.

**Cálculo del enjambre**
- SGP4 de todos los satélites va en el Worker (`propagation/batch.ts` es el cálculo puro, también lo usa el hilo principal si no hay Worker). Entre muestras, el shader mueve cada punto con su velocidad: no se vuelve a propagar en el hilo principal. Cambiar `REFRESH_SECONDS` o `MAX_EXTRAPOLATION_SECONDS` exige revisar el test del error de extrapolación.
- El enjambre tiene un hueco fijo por satélite: se oculta con opacidad 0, nunca se compactan los buffers.

**Datos**
- El navegador nunca llama a CelesTrak. Solo el script de datos, una vez por actualización (cada 2 h) y parando ante cualquier respuesta distinta de 200. Se usa OMM en JSON, no TLE.

**Interfaz**
- React solo aloja el canvas y los paneles; el motor 3D es imperativo (`src/app/engine.ts`).
- El ámbar es solo del objeto seleccionado ([DESIGN.md](../DESIGN.md)). Nombres en Source Serif 4, resto en IBM Plex Sans, cifras con `tabular-nums`. Sin cápsulas ni insignias decorativas; un solo botón relleno por pantalla.

**Código**
- Código y comentarios en español; los comentarios, solo para el porqué.
- Pruebas (`tests/`) para la lógica pura, con TDD cuando es posible; lo que depende de WebGL se verifica en el navegador.
- No afirmar rendimiento sin medirlo ([RENDIMIENTO.md](RENDIMIENTO.md)).

## Verificar en el navegador sin GPU

En un entorno sin GPU, Chrome DevTools no crea WebGL, pero funciona `google-chrome --headless=new --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader`. Con `--screenshot` hay que esperar de verdad a que carguen las texturas (la espera virtual corta antes); para esperar, leer la consola y simular el ratón conviene usar `--remote-debugging-port` y el protocolo CDP. El renderizado por software no sirve para medir rendimiento.

## Problemas que se encontraron y cómo se resolvieron

| Síntoma | Causa | Solución |
| --- | --- | --- |
| Rombos oscuros sobre las nubes | Con una malla de 64×32, el centro de cada cara de la esfera de nubes se hunde bajo la Tierra | Malla de 128×64 y un test que mide el hundimiento (`CLOUD_SEGMENTS`) |
| El planeta salía boca abajo | El orden de filas de KTX2: `toktx` solo voltea PNG y PNM, no JPEG | Convertir el JPEG a PNG antes y codificar con `--lower_left_maps_to_s0t0` |
| Zoom y giro no se redibujaban | `OrbitControls` llama a `update()` en sus propios manejadores de rueda y arrastre y consume el cambio, así que el valor que devuelve no sirve | Escuchar su evento `change` |
| La vista inicial no era la prevista (31° en vez de 10°) | La elevación inicial estaba implícita | Constante `INITIAL_ELEVATION_DEG` y un test de cámara |
| El build de producción fallaba | `satellite.js` incluye workers WebAssembly con `await` de nivel superior y el formato por defecto (`iife`) no lo admite | `worker: { format: 'es' }` en `vite.config.ts` |
| Fuga de memoria de GPU al dibujar la órbita | Sustituir un `BufferAttribute` no libera el buffer anterior de GPU | Buffers de tamaño fijo y reescritura (`ORBIT_POINTS`) |
| El disco solar salía como una rodaja fina | Orientarlo en `onBeforeRender` llega un fotograma tarde con render a demanda | Disco en el shader, primero con billboard y luego «en el infinito» |
| Anillo fino y duro en el borde de la atmósfera | El primer enfoque no se parecía al velo de Google Earth | Velo analítico con la longitud del camino de la vista dentro de la capa |
| La órbita se veía de canto | Al centrar, la cámara quedaba en el plano de la órbita | Inclinación de 35° (`FOCUS_TILT_DEG`) |
| Satélites geoestacionarios recortados o fuera de pantalla | Plano lejano a `distancia + 1`; zoom máximo de 10 radios; encuadre sin contar la perspectiva | `MAX_ORBIT_RADIUS` en el plano lejano, zoom hasta 19,8 y `framingDistance` con la perspectiva; ver [DECISIONES.md](DECISIONES.md) |
| El satélite elegido quedaba tapado por el reloj | El punto cercano de la órbita cae siempre abajo | `focusDirection` elige el lado de la inclinación que lo deja arriba |
| La etiqueta de lo que había bajo el puntero se quedaba tras ocultar la categoría o avanzar el reloj | Solo se comprobaba al mover el ratón | Se vuelve a comprobar en cada actualización con la última posición del puntero |
| Las órbitas geoestacionarias no se dibujaban | El rastreo del cruce del ecuador solo miraba 150 min y la órbita casi no cruza el ecuador | Una vuelta de un periodo desde la época como alternativa |
