# OrbitWatch

Visualizador 3D de satélites en órbita, en el navegador, sobre una Tierra real y con una hora simulada que se puede adelantar y atrasar. Proyecto de portfolio, con el rendimiento medido y cada decisión técnica explicada.

> Demo: aún sin publicar.

![OrbitWatch: la ISS seleccionada sobre el Pacífico, con su órbita y su ficha](docs/captura.jpg)

## Para quién

Para quien lo abre desde un portfolio y quiere entender en pocos segundos qué está viendo, y para el aficionado a los satélites que busca uno concreto, lo elige y consulta su posición, su órbita y cuánto fiarse de los datos.

## Qué hace

- **Un globo con ~11 250 satélites** reales: la ISS y otras estaciones y naves, los satélites meteorológicos (incluidos los geoestacionarios) y la constelación Starlink, con datos orbitales de [CelesTrak](https://celestrak.org/) propagados con SGP4.
- **Tiempo simulado:** adelante, atrás, pausa y vuelta a la hora de tu equipo. La cámara está fija y es la Tierra la que gira, con la luz del Sol real a la hora mostrada (terminador, brillo del mar, sombra de la Tierra sobre el satélite elegido), atmósfera y estrellas.
- **Elegir un satélite** pulsándolo en el globo, desde la lista de su categoría o buscándolo por nombre o número NORAD. La cámara vuela hasta él, se aleja lo necesario para ver su órbita entera y se dibuja la vuelta actual (continua lo recorrido, discontinua lo que falta).
- **Una ficha** con qué es y en qué órbita está, sobre qué punto de la Tierra, su altitud y velocidad (con una regla que la sitúa entre la superficie, la ISS, el GPS y la órbita geoestacionaria), cuánto tarda en dar una vuelta, perigeo, apogeo, inclinación y **cuánto fiarse de los datos** (edad de la descarga y distancia a la época de los elementos).
- **Leyenda y búsqueda** que filtran: cada categoría se puede ocultar en el globo y lo que no coincide con la búsqueda se atenúa.

## Cómo se maneja

| Gesto | Efecto |
| --- | --- |
| Arrastrar / rueda | Girar / acercar y alejar (de ≈ 2 000 a ≈ 120 000 km de la superficie) |
| Pulsar un punto | Elegir ese satélite; pulsar en el vacío o `Esc` lo deselecciona |
| Pasar el ratón sobre un punto | Muestra su nombre |
| `/` | Enfoca el buscador (flechas y `Enter` para elegir, `Esc` para cerrar o borrar) |
| Interruptor y flecha de cada categoría | Mostrar u ocultar en el globo / desplegar la lista |
| Controles del reloj | Retroceder, pausar o reanudar, avanzar, y «Ahora» para volver a la hora del equipo |
| `?t=2026-03-20T14:46:00Z` en la URL | Arranca el reloj en esa hora, en pausa |

La interfaz está pensada para escritorio; en pantallas estrechas aún no se adapta.

## Puesta en marcha

Requisitos: Node 22 y npm. (Probado con Node 22.)

```bash
npm install
npm run data       # descarga los datos de CelesTrak a public/data/ (una vez cada 2 h como máximo)
npm run dev        # servidor de desarrollo (http://localhost:5173)
```

Otros comandos: `npm test` (Vitest), `npm run typecheck`, `npm run build` (typecheck y build de producción en `dist/`), `npm run bench` (mide el cálculo del enjambre y la selección; ver [RENDIMIENTO.md](docs/RENDIMIENTO.md)).

**Importante:** los datos no se versionan y `npm run data` respeta la política de CelesTrak (una descarga por actualización, parar ante cualquier respuesta distinta de 200). No lo ejecutes más de una vez cada 2 horas.

## Cómo está hecho

Resumen; el detalle y los motivos, en la documentación.

- **three.js directo** (sin motor geoespacial) y **React solo para los paneles**: el motor 3D es imperativo y no pasa por el estado de React.
- **Escena inercial:** la cámara no se mueve y la Tierra gira según su ángulo sidéreo, en el mismo marco (TEME) en que SGP4 da las posiciones, así que no hay que convertir cada satélite.
- **Todo el enjambre en una sola llamada de dibujo** y render solo cuando algo cambia: un globo quieto no gasta GPU.
- **Texturas KTX2** (compresión Basis ETC1S): el mapa de día de 8K pesa 2,6 MB y se queda comprimido en la GPU.
- **Los datos los baja un script**, no el navegador, para respetar la política de CelesTrak; la web solo lee ficheros estáticos.
- **Cada afirmación de rendimiento está medida** o dice que no lo está.

## Documentación

- [ARCHITECTURE.md](ARCHITECTURE.md): cómo encajan las piezas, flujo de datos y estructura de carpetas.
- [docs/DECISIONES.md](docs/DECISIONES.md): cada decisión, por qué, qué alternativas se descartaron y las fuentes consultadas.
- [docs/DATOS.md](docs/DATOS.md): origen de los datos, política de CelesTrak, validación, frescura y tamaños.
- [docs/RENDIMIENTO.md](docs/RENDIMIENTO.md): qué está medido (y cómo) y qué no.
- [docs/CONVENCIONES.md](docs/CONVENCIONES.md): reglas del código y los problemas encontrados por el camino.
- [DESIGN.md](DESIGN.md): el lenguaje visual de la interfaz.

## Límites conocidos

- **La precisión es limitada:** con elementos orbitales públicos la posición tiene errores de kilómetros y crece al alejarse de la época; la ficha lo avisa. OrbitWatch es una visualización, no una herramienta operativa.
- Solo escritorio. Sin medidas de rendimiento en una GPU real todavía.
- Las nubes son una foto fija, no el tiempo real. Las estrellas son aleatorias, no las de un catálogo.
- «Estaciones y naves» es el grupo `stations` de CelesTrak e incluye algunos restos y módulos; no hay datos para separarlos.

## Pendiente

Propagación en un Web Worker y catálogo completo (16 847 objetos activos), descarga y despliegue automáticos, cribado de acercamientos entre objetos con su benchmark, país y propietario de cada satélite, colores por régimen orbital, métricas de rendimiento en pantalla, versión móvil, mapa de noche y relieve.

## Licencia y créditos

Código bajo licencia [MIT](LICENSE). Lo que no es código propio (texturas de [Solar System Scope](https://www.solarsystemscope.com/textures/) con licencia CC BY 4.0, datos de [CelesTrak](https://celestrak.org/), fuentes tipográficas y bibliotecas) se detalla en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
