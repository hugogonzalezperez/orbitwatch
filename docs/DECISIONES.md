# Decisiones de diseño y por qué

Cada decisión indica el motivo, las alternativas que se descartaron y su estado. Los números citados están medidos o verificados en la fuente; lo que no, se dice. Para cómo encajan las piezas, ver [ARCHITECTURE.md](../ARCHITECTURE.md); para las cifras de rendimiento, [RENDIMIENTO.md](RENDIMIENTO.md).

## Alcance

OrbitWatch es un visualizador 3D de satélites en órbita, en el navegador, pensado como proyecto de portfolio: que sea vistoso, rápido y que cada decisión técnica esté medida y explicada.

- **Hecho:** globo con texturas, hora simulada, ~19 600 objetos en 13 categorías (ISS y estaciones, meteorología, navegación, Starlink, constelaciones, observación, ciencia, militares, comunicaciones, radioaficionados, CubeSats, otros y restos), búsqueda, leyenda con filtros, filtro por país u operador, ficha con posición, órbita y origen, Sol real, atmósfera y estrellas.
- **Pendiente:** cribado de acercamientos entre objetos, colores por régimen orbital, versión móvil.
- **Fuera de alcance:** cuentas de usuario, base de datos, predicción real de colisiones, propagación en GPU, realidad virtual.
- **Aviso de honestidad:** con elementos orbitales públicos, la posición tiene errores de kilómetros. El cribado de acercamientos (cuando exista) será un filtro para encontrar candidatos, no una predicción operativa, y la interfaz debe decirlo.

## Datos

### OMM en JSON, no TLE
**Motivo.** El formato TLE no puede representar números de catálogo por encima de 99 999. Según CelesTrak, los de 5 dígitos se agotaron el 2026-07-11 y los objetos nuevos tienen 6 dígitos y no tienen TLE. OMM (JSON) sí los soporta, y `satellite.js` lo admite directamente con `json2satrec`. Hoy ya hay objetos de 6 dígitos en el catálogo (por ejemplo, SOYUZ-MS 29 es el 100057) y se propagan sin problema.
**Detalle.** Hay que pedir `FORMAT=json` explícitamente: CSV es el formato por defecto desde el 2026-05-09.

### El navegador nunca habla con CelesTrak
**Motivo.** CelesTrak actualiza los datos GP cada 2 h, pide descargar una sola vez por actualización, y bloquea en el cortafuegos a quien insiste tras un error. Si cada visitante descargara, un proyecto con muchas visitas se saltaría su política.
**Cómo.** Un script (`npm run data`, y más adelante una GitHub Action programada) descarga los grupos, los valida y los deja como ficheros estáticos junto a un `manifest.json`. La web solo lee esos ficheros. Así la web funciona sin backend, con caché normal, y no depende de que CelesTrak esté disponible en el momento de la visita.
**Alternativa descartada.** Space-Track (requiere cuenta y tiene sus propios límites). Solo se consideraría para validar resultados; no se ha comprobado su política.
Detalle del flujo, la validación y las políticas en [DATOS.md](DATOS.md).

### Categorías por función, asignadas al descargar
**Motivo.** Un grupo de CelesTrak no es lo que busca quien mira el globo: `stations` mezcla estaciones, naves y restos; Starlink está en `starlink` y en `active`. Se definen 13 categorías por función (`categories.ts`); un objeto que está en varios grupos recibe la primera categoría de la lista, así que el orden es la prioridad. El script clasifica al descargar y el navegador solo lee el resultado, de modo que cambiar una clasificación no toca la interfaz.
**Cómo se asigna (v2).** Primero el tipo del SATCAT (resto o cuerpo de cohete va a «Restos», esté en el grupo que esté); si no, la primera categoría cuyo grupo lo contiene; y solo si queda en «Otros activos», unas pocas reglas por nombre (`NAME_RULES`). **Motivo:** la versión 1 usaba solo los grupos y dejaba 3 518 satélites en «Otros» (los 40 NAVSTAR antiguos no están en `gnss`; `stations` traía etapas de cohete). Con 40 grupos, el SATCAT y 10 reglas por nombre quedan 1 377. **Por qué reglas por nombre y no más:** el SATCAT dice quién tiene un objeto, no qué hace; cada regla se añadió tras comprobar los nombres y propietarios reales, y se descartó la que no tenía evidencia (COSMOS mezcla militares y navegación). Prefiero «Otros» a una etiqueta dudosa.
**Restos.** Son 2 683 objetos (los de FENGYUN-1C, IRIDIUM 33 y COSMOS 2251, más los `DEB` y `R/B` del SATCAT): saturan el globo, así que parten ocultos (`hiddenByDefault`) y se activan desde la leyenda.
**Comunicaciones.** Sustituye a «Geoestacionarios»: el grupo `geo` de CelesTrak es por órbita, no por función, y ahora se suma a los de operadores (Intelsat, SES, Eutelsat, Telesat, TDRS, Cospas-Sarsat…).

### Un solo catálogo por columnas, con el hash en el nombre
**Motivo.** El navegador descargaba un fichero JSON por grupo, cada uno con las claves repetidas en cada objeto, y creaba un objeto de JavaScript por satélite. Ahora es un único `catalog.<hash>.json` con un array por campo (`columns.ts`): el JSON de `active` ocupa 7,05 MB y el catálogo ampliado (casi 3 000 objetos más) 2,85 MB, 801 kB comprimido. El navegador no crea objetos por satélite: la lista del buscador sale de las columnas y el Worker recibe los números en arrays tipados transferidos (clonar 11 156 registros costaba 15 ms; así no cuesta nada).
**Hash en el nombre y en el manifiesto.** El nombre del fichero lleva 8 caracteres de su SHA-256, así que ninguna caché puede servir datos viejos con un nombre nuevo; el manifiesto guarda el hash completo y el navegador lo comprueba (una descarga cortada o alterada se rechaza) y comprueba también el número de objetos. Un manifiesto de otra versión del formato se rechaza en vez de leerse mal.

### Caché local de 2 h y pausa entre grupos
CelesTrak pide una sola descarga por actualización. Con 40 grupos y el SATCAT, ejecutar el script dos veces durante el desarrollo sería fácil de hacer sin querer: una caché local (`.cache/celestrak/`) devuelve lo bajado hace poco sin tocar la red, y se espera 1 s entre peticiones por cortesía. Solo se cachean los 200: ante un error el script sigue parando, sin reintentar.

**Caché escalonada.** Los elementos de `active` cambian cada 2 h; la pertenencia a un grupo y el SATCAT, una o dos veces al día. Así que `active` se reutiliza 100 minutos (una ejecución cada 2 h siempre lo vuelve a bajar) y lo demás 22 h. La Action cada 2 h hace unas 12 peticiones al día de `active` y 41 de lo otro (53 en total, en vez de 492), y guarda la caché entre ejecuciones con `actions/cache`.

### Validación estricta de cada registro
Cada objeto se comprueba (campos numéricos, excentricidad en [0, 1), movimiento medio positivo, inclinación en [0°, 180°], época válida) y se descarta si falla. Un grupo se rechaza entero si queda por debajo de un mínimo de objetos o si se descarta más del 5 % (señal de que el formato ha cambiado). **Motivo:** es mejor no actualizar que publicar datos a medias. Una época en el futuro se acepta: hay objetos reales así (2 de 16 847 en `active`).

## La Tierra

### Esfera con texturas y zoom limitado, no teselas
**Motivo.** Una esfera de 128×64 segmentos con texturas es barata y se ve bien a las distancias que importan para ver satélites. Una textura de 8K da unos 4,9 km por píxel, así que no llega a nivel de calle como Google Earth, pero queda nítida hasta unos 6 400 km de distancia (estimación con campo de visión de 45° y pantalla de 1080 px).
**Alternativa.** Teselas con niveles de detalle que se cargan al acercarse. Se deja como mejora posible.
**Límites de zoom.** Cerca ≈ 2 000 km sobre la superficie; lejos ≈ 120 000 km, lo bastante para encuadrar una órbita geoestacionaria entera (a 6,6 radios del centro).

### Texturas de Solar System Scope en KTX2
**Fuente.** Solar System Scope (CC BY 4.0, permite uso comercial y adaptación con atribución; verificado en su página). La alternativa, NASA Blue Marble, no ofrece una licencia clara en la página de la colección y su política pide citar a NASA y no sugerir aval.
**Formato.** KTX2 con compresión Basis ETC1S, generado con `scripts/build-textures.sh`. **Motivo:** una textura de 8192×4096 sin comprimir ocupa unos 134 MB en la GPU (un tercio más con mipmaps); en KTX2 se queda comprimida en la GPU. Medido: el mapa de día de 8K pesa 2,6 MB en disco (el JPEG original, 4,5 MB; con UASTC, 13 MB). El brillo del mar y las nubes van a 2K y un solo canal.
**Carga progresiva.** Primero el día de 2K (≈ 220 kB) para pintar rápido, luego el brillo del mar y por último el de 8K, que lo sustituye. Si una carga falla queda el azul liso y el error en consola.
**Nubes.** Segunda esfera (radio 1,002 ≈ 13 km) con una textura de un canal como opacidad. Es una foto fija, no el tiempo real. Su malla es de 128×64: con menos caras, el centro de cada cara se hunde bajo la Tierra y salen rombos (lo cubre un test).
**Pendiente.** Mapa de noche y relieve; la luz ambiente de 0,15 es una licencia artística para que el lado de noche no sea negro puro.

### Atmósfera analítica
La primera versión daba un anillo fino y duro en el borde del planeta, lejos del velo de Google Earth que se buscaba. La atmósfera actual es un velo azul claro que se funde sobre el borde: una capa de radio 1,03 (≈ 190 km, el doble de la altura visible real, por debajo de la ISS) cuyo brillo es la longitud del camino de la vista dentro de la capa, calculada con la geometría exacta del rayo con las dos esferas. Sigue al Sol (nada en el lado de noche) y no tiene tono crepuscular. **Coste:** cubre todo el disco, así que añade un paso de relleno de pantalla completa; no se ha medido en una GPU real.

### El Sol y las estrellas, en el infinito
El Sol usa la posición real de `sunPos` de `satellite.js` (error ≤ 0,008° frente a astronomy-engine en ocho fechas de 2025 a 2030). El disco solar y el fondo de estrellas se dibujan «en el infinito»: su shader usa solo la rotación de la vista y fuerza la profundidad al fondo. **Motivo:** sin paralaje al orbitar, sin tamaño en el mundo ni plano lejano que los alcance, y sin el desfase de un fotograma que tendría orientarlos con `onBeforeRender` bajo render a demanda. Las estrellas son aleatorias con semilla y orientadas en el marco inercial, no las de un catálogo; solo la Vía Láctea queda donde está en el cielo real.

## Tiempo y marcos

### Escena inercial: cámara fija, la Tierra gira
**Motivo.** SGP4 devuelve posiciones en el marco TEME (inercial). Si los satélites se mueven en ese marco y la Tierra gira por su ángulo sidéreo (GMST), no hace falta convertir cada posición a coordenadas terrestres, y la cámara puede estar fija para ver cómo se mueven los satélites alrededor de la Tierra. `temeToScene` hace (x, y, z) → (x, z, −y), con el eje Y hacia arriba. Un test comprueba que la longitud geodésica de la ISS coincide con la de la escena menos el giro de la Tierra. Además, la posición calculada coincide a 0,2 km con la API pública wheretheiss.at en el mismo instante (ambas parten de los mismos elementos, así que comprueba las conversiones, no la física de SGP4).

### Reloj simulado
Hora simulada = hora real × velocidad, con velocidades negativas, pausa, salto y vuelta a la hora del equipo. `?t=` en la URL arranca en una hora y en pausa (verificaciones y demostraciones). **Motivo:** ver cómo se mueven los satélites, adelante y atrás, siempre pudiendo volver a «ahora».

### Unidad de escena: un radio terrestre
1 unidad = 6 371 km. **Motivo:** mantiene los números pequeños y la precisión de float32 alta.

## Render y rendimiento

### Renderizar solo cuando algo cambia
Un globo quieto no gasta GPU. Quien cambie la escena fuera de la cámara llama a `invalidate()`. Medido en Chrome headless: 0 renders en 3 s con el reloj en pausa y 1 por segundo a 1×. A 1× o en pausa la escena se recalcula una vez por segundo o nunca; por encima de 1×, cada fotograma.

### Todos los satélites en una sola llamada de dibujo
Un único `THREE.Points` con un `ShaderMaterial`; posición, color y opacidad por punto. **Motivo:** miles de objetos individuales saturarían la CPU con llamadas de dibujo.

### Buffers de tamaño fijo
Three.js no libera el buffer de GPU de un atributo que se sustituye. La geometría que cambia con el tiempo (la órbita, el enjambre) reescribe buffers de tamaño fijo. Se encontró una fuga real con la línea de la órbita y se corrigió así.

### Selección con búsqueda propia, no con un raycaster
`pickNearest` proyecta cada punto a pantalla y elige el más cercano al puntero dentro de 10 px, ignorando los que tapa la Tierra o quedan detrás de la cámara; sin asignaciones por punto. **Motivo:** lanzar un raycast contra miles de puntos en cada movimiento del ratón es caro. Medido: 0,07 ms de mediana con 11 250 puntos.

### El cálculo de los satélites, en un Worker
Un Worker es un hilo aparte (ver [GLOSARIO.md](GLOSARIO.md)). Recalcular los ~11 250 satélites con SGP4 costaba de 10 a 14 ms en el hilo principal, el mismo que dibuja y atiende al ratón. Ahora el Worker calcula posición y velocidad de todos cada 10 s de tiempo simulado y la página solo recibe el resultado.
**Entre muestras, extrapolación en el shader.** El vertex shader mueve cada punto con `posición + velocidad × tiempo`. El error de extrapolar es la curvatura de la órbita (½ · v²/r · t²): menos de 0,5 km a 10 s en órbita baja, que es la más curvada (un test lo acota con SGP4 real). Por eso se pide una muestra nueva cada 10 s de tiempo simulado, y mientras llega la siguiente (un salto de hora) el tiempo extrapolado se limita a ±60 s, para que los puntos se queden quietos en vez de salir disparados. A cambio, el movimiento es suave a cualquier velocidad de reloj, sin los saltos de una actualización cada 100 ms.
**Un hueco fijo por satélite.** Lo inválido (SGP4 no puede calcularlo) o lo oculto (categoría desactivada) se anula con opacidad 0 en el shader, en lugar de compactar los buffers; así el orden no cambia nunca, los colores solo se suben cuando cambian y la selección bajo el puntero usa el mismo índice. La posición bajo el puntero se extrapola en la página (0,08 ms para 11 250 satélites).
**Sin Worker, sigue funcionando.** Si el navegador no lo permite o falla al arrancar, el mismo cálculo (`batch.ts`) corre en el hilo principal (`transport.ts`).
**Medido:** hilo principal ×3 más libre con el reloj acelerado y 20 % menos de JavaScript al arrancar; ver [RENDIMIENTO.md](RENDIMIENTO.md).

### Qué se calcula con detalle y qué no
Solo el satélite seleccionado tiene altitud, velocidad y órbita, calculados en la página con todo detalle. El enjambre solo tiene posición, velocidad, color y opacidad; su sombra de la Tierra se calcula en el vertex shader (cilindro de radio 1 detrás de la Tierra respecto al Sol, con un borde suave y sin penumbra física), lo que no cuesta nada de CPU. **Motivo:** `shadowFraction` y la conversión geodésica por 11 000 objetos y fotograma no compensan lo que aportan.

### Medidor de rendimiento en pantalla (`?perf`)
**Motivo:** la GPU real es lo que no se puede medir en el entorno de desarrollo, así que el medidor va dentro de la web y cualquiera puede abrirlo en su equipo. Muestra dibujos por segundo, CPU por dibujo y por actualización, llamadas de dibujo, puntos y el estado del Worker. **Límite:** mide CPU, no el tiempo de la GPU.

### La órbita: una vuelta, con tres casos
Se dibuja la vuelta que contiene la hora mostrada, de un cruce ascendente del ecuador al siguiente (rastreo cada 30 s y bisección). Para las órbitas que no cruzan el ecuador o tardan más de 150 min (geoestacionarias, GPS), es una vuelta de un periodo contada desde la época. Lo recorrido va en línea continua y lo que falta, discontinua.

### Que se vean todos los satélites
Con los datos reales, 23 de los 74 satélites meteorológicos son geoestacionarios (a 6,6 radios del centro) y el apogeo máximo es 7,22. Tres consecuencias de diseño: el plano lejano de la cámara llega a `distancia + 12` (con `+ 1`, un satélite lejano por detrás del globo se recortaba); el zoom llega a 19,8 unidades; y al elegir un satélite, la cámara calcula la distancia a la que cabe su órbita contando la perspectiva (el punto más cercano a la cámara es el que más se abre) y se coloca en el lado de la inclinación que deja al satélite en la mitad superior de la pantalla, libre del reloj. La cámara no descuenta que la ficha y la columna tapen parte del lienzo.

## Interfaz

### React solo para los paneles
El motor 3D es imperativo (`app/engine.ts`) y no pasa por el estado de React; React se suscribe con `useSyncExternalStore` a unos pocos `Store` (datos, seleccionado). Las etiquetas sobre el globo son DOM imperativo, no React, porque se recolocan en cada fotograma.

### Del panel lateral a la ficha
Una primera versión usaba una columna fija a la derecha dividida en 70 % lista y 30 % información. Resultaba una plantilla de panel de control, con la información clave escondida y en jerga. La versión actual: el globo ocupa toda la ventana; la leyenda y el buscador van a la izquierda; la ficha (qué es, dónde está, cómo es su órbita, cuánto fiarse) aparece a la derecha solo con algo seleccionado. Detalle en [DESIGN.md](../DESIGN.md).

### La leyenda es también el filtro
Cada categoría muestra su color, su recuento y un interruptor que la oculta en el globo (oculta = punto hueco, no solo más apagado). Se despliega en una lista con ventana virtual: Starlink son 11 156 filas y solo se pintan las visibles.

### Una regla graduada como motivo propio
La altitud y la vuelta comparten el mismo trazo de instrumento con marcas. La regla de altitud (0 a 40 000 km, escala de raíz cuadrada para que la órbita baja no se pegue a la superficie) marca la ISS, el GPS y la órbita geoestacionaria, y da sentido a «425 km».

### El estado va en la dirección
`?sat=25544&owner=US&hide=starlink&color=regime` reproduce lo que se ve: satélite, país u operador, categorías ocultas y modo de color. La dirección se reescribe con `history.replaceState` (sin llenar el historial) y solo con lo que se aparta de lo habitual; `src/app/urlState.ts` lo lee y lo escribe con validación (un `owner` o un `hide` con forma rara se ignora) y con tests. La hora no se escribe sola, porque cambia cada segundo: «Copiar enlace» la añade (`t=`) si el reloj no marca la hora real. **Motivo:** compartir un satélite a una hora sin cuentas ni servidor. Los ajustes que llegan antes de que cargue el enjambre (los filtros de un enlace) se guardan y se aplican al crearlo; antes se perdían.

### Colorear por función o por órbita
El color por categoría responde «qué es»; el color por tipo de órbita (baja, media, geosíncrona, elíptica, alta) responde «dónde está». Es una opción, no un reemplazo. El tipo de cada satélite se calcula al cargar con `regimeOf` (el mismo criterio que la ficha, sin construir registros) y el enjambre elige color por hueco; la opacidad sigue siendo la de la categoría, para que Starlink no tape al resto. El ámbar sigue reservado al seleccionado.

### Cribado de acercamientos: una instantánea con rejilla
«Acercamientos ahora» lista los pares de objetos visibles a menos de 10 km a la hora mostrada. Una rejilla con celdas del tamaño del umbral deja a cada objeto solo sus 27 celdas vecinas y la distancia exacta decide (`src/satellites/screening.ts`): unos 27 ms con 19 612 objetos frente a unos 8 s comparando todos con todos (`npm run bench`). **No es una predicción de colisión:** es una distancia en un instante con elementos públicos de errores de kilómetros, y el panel lo dice. Se descartan los pares del mismo lanzamiento y los de menos de 1 km (la ISS y sus naves acopladas salen a 0,7 km por ese error). **Alternativa descartada:** buscar el instante de máximo acercamiento (TCA) en una ventana de tiempo; exigiría propagar toda la ventana y refinar cada par, y la precisión de los datos no lo justifica.

### Móvil: hoja inferior y filtros plegables
Por debajo de 48 rem el buscador queda arriba con un botón que despliega los filtros y las categorías, y la ficha pasa a ser una hoja sobre el reloj (que se reorganiza en tres filas). Al elegir un satélite los filtros se pliegan. Comprobado en 390 × 844 sin desbordamiento horizontal.

### Política de contenido en el build
GitHub Pages no permite cabeceras, así que el build lleva una etiqueta `Content-Security-Policy` (solo recursos del propio sitio, `wasm-unsafe-eval` para SGP4 y las texturas, `form-action 'none'`, `object-src 'none'`). Solo en el build: el servidor de desarrollo inyecta scripts. Comprobado en el navegador sin violaciones.

### El paquete de JavaScript no se parte
932 kB sin comprimir y 265 kB comprimido, más 20 kB del Worker y el transcodificador de texturas aparte. Partirlo en trozos (three, React, satellite.js) no reduciría lo que se descarga la primera vez, y los nombres de los ficheros llevan hash: el redespliegue cada 2 h solo cambia los datos, así que la caché del navegador ya reutiliza el JavaScript. Se deja como está; el aviso de tamaño de Vite es informativo.

### Pruebas de humo y accesibilidad automáticas
`npm run e2e` (Playwright con el Chrome del sistema y renderizado por software, contra el build) comprueba lo esencial: carga, 13 categorías, ficha de la ISS, búsqueda, enlace con estado, filtro por país, salto de hora y acercamientos, y pasa axe (WCAG 2.0/2.1 A y AA) sobre dos estados. La política de contenido bloquea el `new Function` con el que Playwright evalúa en la página; esos errores son de la herramienta y se filtran (la app no los produce). Axe corre con la política desactivada porque se inyecta como script.

## Alojamiento y dominio

**GitHub Pages con el repositorio público.** GitHub Pages exige repositorio público o de pago (comprobado en los ajustes del repositorio el 2026-11-02). Con el repositorio público es gratis, el mismo origen para web y datos (sin CORS) y admite dominio propio con HTTPS. Para un portfolio, además, que el código se pueda leer es parte del valor. **Alternativa descartada:** Cloudflare Pages con el repositorio privado, desplegando el resultado construido con `wrangler pages deploy` desde la Action (plan gratuito: 500 builds al mes, 20 000 ficheros y 25 MiB por fichero; documentación de Cloudflare). Permite controlar las cabeceras de caché, pero añade una cuenta y secretos.
**Dirección.** Primero la URL de GitHub (`https://hugogonzalezperez.github.io/orbitwatch/`); un subdominio con el DNS en Vercel se añade después con un registro `CNAME` sin tocar el código ([DESPLIEGUE.md](DESPLIEGUE.md)).
**Los datos se refrescan con la propia Action**, cada 2 h, sin hacer commits: solo el despliegue programado descarga de CelesTrak; un cambio de código reutiliza los datos ya publicados; si CelesTrak falla, se republica la última copia buena. Los crons de GitHub solo corren en la rama por defecto y los de los repositorios públicos se desactivan tras 60 días sin actividad.
**Riesgo sin comprobar:** si CelesTrak bloquea las IPs de los ejecutores de GitHub. La política dice que ante cualquier respuesta distinta de 200 se detiene todo, y la Action lo cumple.

## Fuentes consultadas

- [CelesTrak: formatos de datos GP](https://celestrak.org/NORAD/documentation/gp-data-formats.php)
- [CelesTrak: grupos y consultas](https://celestrak.org/NORAD/elements/)
- [CelesTrak: política de uso](https://celestrak.org/usage-policy.php)
- [Solar System Scope: texturas](https://www.solarsystemscope.com/textures/)
- [NASA: colección Blue Marble](https://science.nasa.gov/earth/earth-observatory/collections/blue-marble)
- [NASA: imágenes y uso](https://www.nasa.gov/nasa-brand-center/images-and-media/)
- [satellite.js](https://github.com/shashwatak/satellite-js)
- [Cosmos: propagación en worker y puntos en GPU](https://github.com/Yashkapure06/Cosmos)
- [Hilo de three.js: rastreador 3D de satélites](https://discourse.threejs.org/t/side-project-a-3d-satellite-tracker/48002)
- [Límites de Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/)
- [Despliegue directo en Cloudflare Pages](https://developers.cloudflare.com/pages/get-started/direct-upload/)
