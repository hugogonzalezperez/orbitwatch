# Datos de los satélites

## Fuente

[CelesTrak](https://celestrak.org/), API GP, formato **OMM en JSON**. Consulta: `https://celestrak.org/NORAD/elements/gp.php?GROUP=<grupo>&FORMAT=json`. Hay que pedir el formato explícitamente. El proyecto usa `celestrak.org` (el dominio `.com` redirige y la descarga trata cualquier redirección como un error).

## Grupos, SATCAT y categorías

Se descargan **40 grupos** de CelesTrak y el **SATCAT** (cifras del 2026-11-02 y 2026-11-03) y se unen en un catálogo de **19 612 objetos únicos** en 13 categorías por función.

Cada objeto recibe su categoría así, en este orden:

1. **Tipo del SATCAT.** Si el SATCAT dice que es un resto (`DEB`) o un cuerpo de cohete (`R/B`), va a «Restos y cuerpos de cohete», esté en el grupo que esté. Antes los restos que CelesTrak mete en `stations` (por ejemplo, etapas de cohete) salían como estaciones.
2. **Grupos.** La primera categoría de la lista cuyo grupo contenga al objeto (el orden de la tabla es la prioridad). Un satélite de Starlink está en `starlink` y en `active`, y sale como Starlink.
3. **Nombre.** Solo si lo anterior lo deja en «Otros activos», unas pocas reglas por nombre (`NAME_RULES` en `categories.ts`) recogen familias que CelesTrak no agrupa: NAVSTAR (GPS antiguos) a navegación, YAOGAN, GAOFEN, LEMUR, HAWK a observación de la Tierra, RASSVET o HULIANWANG a constelaciones, SDA y PRAETORIAN a militares, SHIYAN a ciencia, TOMORROW a meteorología… Cada regla se añadió tras ver esos nombres en los datos y su propietario; se descartó la que no tenía evidencia (por ejemplo, COSMOS, que mezcla militares y navegación).

| Categoría | Grupos de CelesTrak | Objetos |
| --- | --- | --- |
| Estaciones y naves | `stations` | 19 |
| Meteorología | `weather` | 87 |
| Navegación | `gnss`, `sbas` | 206 |
| Starlink | `starlink` | 11 183 |
| Otras constelaciones | `oneweb`, `iridium-NEXT`, `globalstar`, `orbcomm`, `kuiper`, `qianfan`, `hulianwang` | 1 830 |
| Observación de la Tierra | `resource`, `sar`, `planet`, `spire`, `dmc`, `argos` | 912 |
| Ciencia | `science`, `geodetic`, `engineering`, `education`, `radar` | 162 |
| Militares | `military` | 86 |
| Comunicaciones | `intelsat`, `ses`, `eutelsat`, `telesat`, `tdrss`, `sarsat`, `other-comm`, `x-comm`, `geo` | 552 |
| Radioaficionados | `amateur`, `satnogs` | 488 |
| CubeSats | `cubesat` | 27 |
| Otros activos | `active` (lo que no cayó en ninguna anterior) | 1 377 |
| Restos y cuerpos de cohete (ocultos por defecto) | `fengyun-1c-debris`, `iridium-33-debris`, `cosmos-2251-debris`, y cualquier `DEB` o `R/B` del SATCAT | 2 683 |

La definición está en `src/satellites/categories.ts` (con el color, la opacidad y si parte oculta) y los grupos que se descargan salen de ella (`src/satellites/data/groups.ts`). El tipo, el propietario, el estado y la fecha de lanzamiento salen del SATCAT (`assemble.ts` los une por número de catálogo).

**Lo que sigue sin resolverse.** Los 1 377 «Otros activos» son, sobre todo, satélites reales de familias que CelesTrak no agrupa y que no tienen una función evidente por el nombre: COSMOS (89), objetos de lanzamientos compartidos sin identificar (`TRANSPORTER-n OBJECT X`, propietario por determinar), series pequeñas… El SATCAT no dice la función de un satélite, solo quién lo tiene y qué tipo de objeto es, así que clasificarlos mejor exigiría una tabla propia mantenida a mano. Se prefiere dejarlos como «Otros» antes que adivinar.

## Política de uso de CelesTrak y cómo se respeta

Fuente: [política de uso](https://celestrak.org/usage-policy.php).

| Norma | Cómo se cumple |
| --- | --- |
| Los datos GP se actualizan cada 2 h; descargar una sola vez por actualización | Un único proceso descarga (el script y la Action programada). El navegador nunca consulta CelesTrak. Una **caché local** (`.cache/celestrak/`, no se versiona) evita repetir una descarga reciente: ejecutar el script dos veces seguidas no vuelve a pedir nada. La caché es **escalonada**: `active` (el único grupo que cambia cada 2 h) se reutiliza 100 minutos; el resto de grupos y el SATCAT, que CelesTrak actualiza una o dos veces al día, 22 h |
| Ante cualquier respuesta distinta de 200, dejar de consultar | `fetchGroups` se detiene en el primer fallo, sin reintentos, y no escribe ningún fichero. Lo que no es 200 no se cachea |
| Más de 50 respuestas 301, 403 o 404 en 2 h pueden acabar con la IP bloqueada | Una petición por grupo y ejecución, sin bucles; las redirecciones se tratan como error (`redirect: 'error'`) |
| Las listas grandes (`active`, `starlink`) empiezan a tener límites | Se piden una vez cada una, con **una pausa de 1 s entre grupos** (cortesía) |
| Muchos usuarios tras una IP: usar un proxy con caché | La capa estática hace de caché |
| Identificarse | Cabecera `User-Agent` con el nombre del proyecto y el repositorio |

Los datos no llevan `Last-Modified` ni `ETag`, así que no se puede preguntar «¿ha cambiado?» sin descargar. Una descarga completa (40 grupos y el SATCAT, 41 peticiones) tarda unos 53 s por la pausa. Con la caché escalonada y la Action cada 2 h, el consumo normal es **una petición por ejecución (`active`) más las otras 40 una vez al día: unas 12 + 41 = 53 peticiones al día**, frente a las 492 que haría pedirlo todo cada 2 h.

## El proceso: `npm run data`

`scripts/update-data.ts` descarga los grupos de uno en uno y después el SATCAT, valida cada registro, los une (`assembleCatalog`: un registro por número de catálogo, el de época más reciente si varios grupos lo traen), los clasifica y, solo si todo llegó entero y válido, escribe en `public/data/`:

- **`catalog.<hash>.json`**: el catálogo por columnas, con el hash SHA-256 de su contenido en el nombre (8 caracteres). Cada versión tiene su nombre, así que ninguna caché puede servir datos viejos con un nombre nuevo.
- **`manifest.json`**: apunta al catálogo y lleva su hash completo y su número de objetos.

Borra los catálogos anteriores y los ficheros del formato antiguo (un fichero por grupo). `public/data/` no se versiona. Hay que ejecutarlo antes de `npm run dev`.

### Formato por columnas (`src/satellites/data/columns.ts`)

Un array por campo, y la fila `i` de todos ellos es el satélite `i`: `id`, `name`, `designator`, `epoch`, nueve elementos numéricos (`meanMotion`, `eccentricity`, `inclination`, `raan`, `argPerigee`, `meanAnomaly`, `bstar`, `ndot`, `nddot`) `category` (posición en la tabla `categories`) y, del SATCAT, `owner`, `type`, `status` y `launch` (texto). **Motivo:** no repite las claves de cada objeto (el `active` de CelesTrak ocupa 7,05 MB y el catálogo completo, 3,41 MB con tres veces los grupos y el SATCAT), comprime mejor y el navegador no necesita crear un objeto por satélite: solo el elegido se reconstruye como registro (`recordAt`), y el Worker recibe los números como arrays tipados transferidos.

### Validación

- **En el script**, antes de escribir: cada registro necesita estos campos numéricos y finitos: `NORAD_CAT_ID`, `MEAN_MOTION`, `ECCENTRICITY`, `INCLINATION`, `RA_OF_ASC_NODE`, `ARG_OF_PERICENTER`, `MEAN_ANOMALY`, `BSTAR`, `MEAN_MOTION_DOT`, `MEAN_MOTION_DDOT`, y una `EPOCH` que sea una fecha (UTC, aunque CelesTrak no ponga zona horaria). Se descarta el registro con excentricidad fuera de [0, 1), movimiento medio ≤ 0 o inclinación fuera de [0°, 180°]. Una época en el futuro se acepta (hay objetos reales así). Un nombre o designador nulo o ausente queda como cadena vacía. Un grupo se rechaza entero si tiene menos objetos válidos que su mínimo (la mitad de lo observado el 2026-11-02) o si se descartó más del 5 %.
- **En el navegador**, al cargar: el manifiesto debe ser de la versión 4 y tener un nombre de fichero del tipo `catalog.<8 hex>.json`, sin rutas ni URL; el catálogo debe coincidir con su hash SHA-256 (una descarga cortada o alterada se rechaza); `parseColumns` comprueba la forma (listas de la misma longitud, números finitos, categorías dentro de la tabla); y el número de objetos debe coincidir con el del manifiesto.

### El manifiesto

```json
{
  "schemaVersion": 4,
  "generatedAt": "2026-11-03T00:26:00.000Z",
  "catalog": { "file": "catalog.a6c379ad.json", "count": 19612, "sha256": "a6c379ad…" },
  "groups": [{ "group": "stations", "count": 20 }, …]
}
```

`generatedAt` es cuándo se descargaron los datos, y no es lo mismo que la época de cada objeto. `groups` recoge lo que trajo cada grupo antes de unirlos.

## Frescura y fiabilidad

Hay dos edades, y la ficha de cada satélite las resume en una sola frase («Fiable: elementos de hace 3 h») con el detalle plegado:

- **Edad de la descarga** (`generatedAt` frente a la hora real): hasta 3 h es normal, de 3 a 6 h es aviso, desde 6 h son datos desactualizados. CelesTrak actualiza cada 2 h.
- **Distancia a la época** (época del objeto frente a la hora simulada, hacia delante y hacia atrás): hasta 3 días es normal, de 3 a 7 días la precisión baja, desde 7 días es poco fiable. SGP4 pierde precisión al alejarse de la época. Sobre los 16 847 objetos de `active` (medido el 2026-11-02), el 90,8 % tiene la época con menos de un día, el 8,3 % entre 1 y 3 días, el 0,7 % entre 3 y 7 y el 0,2 % con más de 7.

Con el despliegue automático, si CelesTrak falla o los datos no valen, se republican los últimos datos buenos del sitio (ver [DESPLIEGUE.md](DESPLIEGUE.md)).

## Tamaño

| Qué | Sin comprimir | Comprimido (gzip) |
| --- | --- | --- |
| `catalog.<hash>.json` (19 612 objetos, 13 categorías, con SATCAT) | 3,41 MB | 821 kB |
| SATCAT completo (CSV de CelesTrak, 71 228 objetos, de los que se guardan solo los 19 612 del catálogo) | 6,8 MB | n/d |
| `active` completo (JSON original de CelesTrak, 16 847 objetos) | 7,05 MB | 963 kB |

## Cómo se usan después

Al cargar, el navegador lee el manifiesto, descarga el catálogo y lo verifica. A partir de las columnas construye la lista del buscador y de la leyenda (`buildCatalog`, sin crear registros) y manda los números al Worker, que calcula las posiciones. La categoría de cada satélite sale de la tabla de categorías del catálogo; la leyenda parte con las categorías marcadas `hiddenByDefault` ocultas (los restos).

## SATCAT

[SATCAT](https://celestrak.org/satcat/) es el catálogo de CelesTrak con lo que los elementos orbitales no traen. Se descarga en CSV (`https://celestrak.org/pub/satcat.csv`, una sola petición, sin redirecciones, mínimo de 40 000 filas para aceptarlo) y de cada fila se usan cuatro campos, por el nombre de su columna (no por posición, así un cambio de orden no los mezcla):

- `OBJECT_TYPE`: carga útil (`PAY`), cuerpo de cohete (`R/B`), resto (`DEB`) o desconocido (`UNK`).
- `OWNER`: código de propietario (`US`, `PRC`, `CIS`, `ESA`, `SES`…). `src/satellites/origin.ts` los traduce al español («Rusia y antigua URSS», «Estación Espacial Internacional»); un código que no figura se enseña tal cual. Son países y también operadores, por eso el filtro se llama «País u operador».
- `OPS_STATUS_CODE`: operativo, no operativo, en reserva, en misión extendida… Los restos no tienen.
- `LAUNCH_DATE`: fecha de lanzamiento, que la ficha escribe con su antigüedad («26 oct 2007 (hace 19 años)»).

Qué hace el proyecto con ello: separa restos y cuerpos de cohete de las cargas útiles al clasificar (ver arriba), muestra el origen en la ficha y permite **filtrar por país u operador** desde la columna izquierda (el filtro limita a la vez la leyenda, la búsqueda y el globo, que atenúa lo que no coincide). El propietario no entra en la búsqueda por texto: «ado» traería a todos los de «Estados Unidos».
