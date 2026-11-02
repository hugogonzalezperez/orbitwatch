# Hoja de ruta

Qué falta para dar OrbitWatch por concluido, en fases con hitos comprobables. Se marca cada casilla cuando está hecha **y verificada**; el criterio de cada fase dice cómo se comprueba. Las decisiones y su motivo están en [DECISIONES.md](DECISIONES.md); lo medido, en [RENDIMIENTO.md](RENDIMIENTO.md); los términos técnicos, en [GLOSARIO.md](GLOSARIO.md).

Estado a 2026-11-02: las fases A y B están hechas. La web funciona de punta a punta con ~11 250 satélites (ISS, estaciones, meteorología y Starlink) y el cálculo va en un Worker, pero los datos se descargan a mano y no hay despliegue.

## Fase A: corrección y limpieza

Arreglar lo que la revisión del código y de la interfaz encontró, antes de construir encima.

- [x] **A1. Arranque más rápido.** Catálogo ordenado con un `Intl.Collator` reutilizado: 450 ms → 34 ms con los datos reales. El arranque está en `npm run bench`.
- [x] **A2. `Esc` con el buscador vacío enfocado** debe cerrar la ficha (hoy se lo traga). La decisión va en una función pura con test.
- [x] **A3. Tests de `createSatellites`** (selección, pulsar sobre un punto, categorías ocultas, radio de la órbita) con los datos reales de `tests/fixtures` y un `fetch` falso.
- [x] **A4. Quitar duplicados** (`cssColor` está en dos ficheros).
- [x] **A5. Guías de interfaz web:** `theme-color` y `color-scheme: dark`; placeholder del buscador con «…» y ejemplo; espacios duros entre cifra y unidad y en los miles; `<aside>` en lugar de `<nav>`; nombre accesible para el canvas; anuncio de la selección para lectores de pantalla; `overscroll-behavior` y `touch-action`; `translate="no"` en nombres; búsqueda sin resultados con una sugerencia.
- [x] **A6. La etiqueta del seleccionado** solo se recoloca cuando cambia algo (hoy, en cada fotograma).
- [x] **A7. Comentarios:** bloques de 3 o más líneas recortados a 2.
- [x] **A8. `engines`** en `package.json`.

**Criterio:** `npm test`, `npm run typecheck` y `npm run build` en verde, y comprobado en el navegador (buscador, ficha, `Esc`, unidades). **Cumplido:** 257 tests, typecheck y build en verde; `Esc`, etiqueta, semántica, placeholder y espacios duros comprobados en el navegador.

## Fase B: rendimiento

Sacar el cálculo de los satélites del hilo principal y poder medir en cualquier equipo. Qué es un Worker y SGP4: [GLOSARIO.md](GLOSARIO.md).

- [x] **B1. Medidor `?perf`:** renders por segundo, tiempo de CPU por fotograma, llamadas de dibujo, puntos, tiempo del cálculo y antigüedad de la última muestra. Para medir en una GPU real sin herramientas.
- [x] **B2. Cálculo en un Worker con extrapolación en el shader.** El Worker calcula posición y velocidad de todos los satélites cada pocos segundos de tiempo simulado; el vertex shader mueve cada punto con `posición + velocidad × tiempo` entre muestras. Un hueco fijo por satélite: se oculta con opacidad 0 y solo se suben posiciones. Sin Worker (entornos de prueba), el mismo cálculo corre en el hilo principal.
- [x] **B3. Sombra de la Tierra en el shader** para todo el enjambre.
- [x] **B4. Medir antes y después** y actualizar [RENDIMIENTO.md](RENDIMIENTO.md) y [ARCHITECTURE.md](../ARCHITECTURE.md).

**Criterio:** el hilo principal no calcula órbitas del enjambre; el arranque ya no hace `json2satrec` de 11 250 objetos; el error de la extrapolación está acotado con un test; todo comprobado en el navegador. **Cumplido:** hilo principal ×3 más libre con el reloj acelerado (16 % → 5,5 % de JavaScript) y 20 % menos de JavaScript al arrancar; error de extrapolación < 0,5 km a 10 s (test); sombra comprobada con la misma hora fija (−38 % de brillo en 25 960 píxeles). Cifras y método en [RENDIMIENTO.md](RENDIMIENTO.md).

## Fase C: publicar

- [ ] **C1.** Script de datos para integración continua (una descarga, validación, copia del último conjunto válido si CelesTrak falla).
- [ ] **C2.** GitHub Action programada cada 2 h (minuto 17, que no coincide con la hora en punto) que descarga, construye y despliega en GitHub Pages.
- [ ] **C3.** Decidir dirección: subdominio de tu dominio (CNAME) o ruta; configurar la base de la aplicación según la elección.
- [ ] **C4.** Comprobar en producción que CelesTrak no bloquea las IPs de la Action (riesgo abierto).
- [ ] **C5.** Medir en una GPU real con `?perf` y documentarlo.

**Criterio:** URL pública que se refresca sola, dos ejecuciones programadas seguidas correctas y cifras de una GPU real.

## Fase D: más datos

**Diseño.** Hoy cada grupo de CelesTrak es una categoría y el navegador descarga un fichero por grupo. Pasa a:

- **Categorías por función**, no por grupo de CelesTrak: estaciones y naves, meteorología, navegación, Starlink, otras constelaciones de comunicaciones, observación de la Tierra, ciencia, militares, geoestacionarios, radioaficionados, CubeSats, otros activos y restos. Un objeto que está en varios grupos recibe la primera categoría de esa lista (el orden es la prioridad).
- **Un solo fichero de catálogo por columnas** (`catalog.<hash>.json`, un array por campo), con la categoría ya asignada. El script de datos descarga los grupos, deduplica por número de catálogo, clasifica y escribe ese fichero y el manifiesto. El navegador no clasifica ni valida semánticamente: lo hizo el script.
- **Los números van al Worker como arrays tipados transferidos**, sin copiar y sin crear 17 000 objetos en el hilo principal; solo el satélite elegido se reconstruye como registro.
- **Los restos van ocultos por defecto** (su casilla de la leyenda parte desmarcada).
- **La política de CelesTrak se protege con una caché local**: el script no vuelve a descargar un grupo que se bajó hace menos de 2 h, y espera un segundo entre grupos.

- [ ] **D1. Más grupos y categorías por función** (`categories.ts` con sus grupos y prioridad; `assembleCatalog` puro y con tests).
- [ ] **D2. Formato por columnas** con hash en el nombre (`columns.ts`, manifiesto v3, carga en el navegador, Worker con arrays tipados).
- [ ] **D3. Caché local y pausa entre grupos** en el script de datos.
- [ ] **D4. Restos ocultos por defecto** y colores por categoría comprobados (contraste de las marcas de la leyenda).
- [ ] **D5. SATCAT:** propietario, tipo y fecha de lanzamiento; separar restos y filtrar por país. Antes hay que comprobar su tamaño y política en CelesTrak.
- [ ] **D6. Colores por régimen orbital** (opción de coloreado).

**Criterio:** el catálogo ampliado (≈ 17 000 a 22 000 objetos) carga y se mueve con el cálculo fuera del hilo principal, sin saturar el globo: medido con `?perf` y `npm run bench`.

## Fase E: diseño y experiencia de uso

- [ ] **E1.** Móvil: la columna y la ficha pasan a una hoja inferior.
- [ ] **E2.** URL con estado (`?sat=…`, categorías ocultas) para compartir un satélite a una hora.
- [ ] **E3.** Saltar a una fecha y hora desde el reloj.
- [ ] **E4.** Seguir al satélite con la cámara al acelerar el tiempo.
- [ ] **E5.** Primer uso: una ayuda corta de los gestos.
- [ ] **E6.** Detalles de la ficha (el desplegable «Ver el detalle» es poco visible) y filas de 44 px.

## Fase F: cribado y entrega

- [ ] **F1.** Cribado de acercamientos en cascada (altitud, rejilla espacial, refinado) con panel de resultados y benchmark frente a la versión ingenua, publicado en el README.
- [ ] **F2.** Prueba de humo con Playwright.
- [ ] **F3.** Pasada de accesibilidad con teclado y lector de pantalla.
- [ ] **F4.** README con la URL, vídeo corto y cifras finales.
- [ ] **F5.** Partir el paquete de JavaScript (910 kB sin comprimir, 259 kB comprimido) si la medición lo justifica.

## Decisiones abiertas

- Dirección del sitio: subdominio o ruta (fase C).
- Si el mapa de noche y el relieve entran (aspecto del planeta).
- Si hace falta calidad adaptativa por tiempo de fotograma, tras medir en una GPU real.
