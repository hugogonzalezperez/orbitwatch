# Datos de los satélites

## Fuente

[CelesTrak](https://celestrak.org/), API GP, formato **OMM en JSON**. Consulta: `https://celestrak.org/NORAD/elements/gp.php?GROUP=<grupo>&FORMAT=json`. Hay que pedir el formato explícitamente. El proyecto usa `celestrak.org` (el dominio `.com` redirige y la descarga trata cualquier redirección como un error).

## Grupos y categorías

Se descargan 20 grupos de CelesTrak (cifras del 2026-11-02) y se unen en un catálogo de **19 520 objetos únicos** en 13 categorías por función. Un objeto que está en varios grupos (por ejemplo, un satélite de Starlink está en `starlink` y en `active`) recibe **la primera categoría de la lista** que tenga alguno de sus grupos; el orden de la tabla es la prioridad.

| Categoría | Grupos de CelesTrak | Objetos |
| --- | --- | --- |
| Estaciones y naves | `stations` | 20 |
| Meteorología | `weather` | 74 |
| Navegación | `gnss` | 169 |
| Starlink | `starlink` | 11 156 |
| Otras constelaciones | `oneweb`, `iridium-NEXT`, `globalstar`, `orbcomm` | 781 |
| Observación de la Tierra | `resource`, `sar`, `planet` | 392 |
| Ciencia | `science` | 45 |
| Militares | `military` | 44 |
| Geoestacionarios | `geo` | 499 |
| Radioaficionados | `amateur` | 92 |
| CubeSats | `cubesat` | 58 |
| Otros activos | `active` (lo que no cayó en ninguna anterior) | 3 518 |
| Restos de colisiones (ocultos por defecto) | `fengyun-1c-debris`, `iridium-33-debris`, `cosmos-2251-debris` | 2 672 |

La definición está en `src/satellites/categories.ts` (con el color, la opacidad y si parte oculta) y los grupos que se descargan salen de ella (`src/satellites/data/groups.ts`).

**Limitaciones de clasificar por grupos.** Es la clasificación de CelesTrak, no la nuestra: el grupo `gnss` trae los satélites que llevan «GPS», «COSMOS», «BEIDOU»… en el nombre, pero no los 40 antiguos «NAVSTAR» (GPS de bloques viejos), que están en `active` y quedan en «Otros activos». «Estaciones y naves» incluye módulos y restos que CelesTrak agrupa con las estaciones. Para clasificar mejor haría falta SATCAT (ver más abajo).

## Política de uso de CelesTrak y cómo se respeta

Fuente: [política de uso](https://celestrak.org/usage-policy.php).

| Norma | Cómo se cumple |
| --- | --- |
| Los datos GP se actualizan cada 2 h; descargar una sola vez por actualización | Un único proceso descarga (el script, y más adelante una Action programada). El navegador nunca consulta CelesTrak. Una **caché local** (`.cache/celestrak/`, no se versiona) no repite un grupo bajado hace menos de 2 h: ejecutar el script dos veces seguidas no vuelve a pedir nada |
| Ante cualquier respuesta distinta de 200, dejar de consultar | `fetchGroups` se detiene en el primer fallo, sin reintentos, y no escribe ningún fichero. Lo que no es 200 no se cachea |
| Más de 50 respuestas 301, 403 o 404 en 2 h pueden acabar con la IP bloqueada | Una petición por grupo y ejecución, sin bucles; las redirecciones se tratan como error (`redirect: 'error'`) |
| Las listas grandes (`active`, `starlink`) empiezan a tener límites | Se piden una vez cada una, con **una pausa de 1 s entre grupos** (cortesía) |
| Muchos usuarios tras una IP: usar un proxy con caché | La capa estática hace de caché |
| Identificarse | Cabecera `User-Agent` con el nombre del proyecto y el repositorio |

Los datos no llevan `Last-Modified` ni `ETag`, así que no se puede preguntar «¿ha cambiado?» sin descargar. Descargar los 20 grupos tarda unos 33 s (por la pausa).

## El proceso: `npm run data`

`scripts/update-data.ts` descarga los grupos de uno en uno, valida cada registro, los une (`assembleCatalog`: un registro por número de catálogo, el de época más reciente si varios grupos lo traen), los clasifica y, solo si todos los grupos llegaron enteros y válidos, escribe en `public/data/`:

- **`catalog.<hash>.json`**: el catálogo por columnas, con el hash SHA-256 de su contenido en el nombre (8 caracteres). Cada versión tiene su nombre, así que ninguna caché puede servir datos viejos con un nombre nuevo.
- **`manifest.json`**: apunta al catálogo y lleva su hash completo y su número de objetos.

Borra los catálogos anteriores y los ficheros del formato antiguo (un fichero por grupo). `public/data/` no se versiona. Hay que ejecutarlo antes de `npm run dev`.

### Formato por columnas (`src/satellites/data/columns.ts`)

Un array por campo, y la fila `i` de todos ellos es el satélite `i`: `id`, `name`, `designator`, `epoch`, nueve elementos numéricos (`meanMotion`, `eccentricity`, `inclination`, `raan`, `argPerigee`, `meanAnomaly`, `bstar`, `ndot`, `nddot`) y `category` (posición en la tabla `categories`). **Motivo:** no repite las claves de cada objeto (el `active` de CelesTrak ocupa 7,05 MB y el catálogo ampliado, 2,85 MB para casi 3 000 objetos más), comprime mejor y el navegador no necesita crear un objeto por satélite: solo el elegido se reconstruye como registro (`recordAt`), y el Worker recibe los números como arrays tipados transferidos.

### Validación

- **En el script**, antes de escribir: cada registro necesita estos campos numéricos y finitos: `NORAD_CAT_ID`, `MEAN_MOTION`, `ECCENTRICITY`, `INCLINATION`, `RA_OF_ASC_NODE`, `ARG_OF_PERICENTER`, `MEAN_ANOMALY`, `BSTAR`, `MEAN_MOTION_DOT`, `MEAN_MOTION_DDOT`, y una `EPOCH` que sea una fecha (UTC, aunque CelesTrak no ponga zona horaria). Se descarta el registro con excentricidad fuera de [0, 1), movimiento medio ≤ 0 o inclinación fuera de [0°, 180°]. Una época en el futuro se acepta (hay objetos reales así). Un nombre o designador nulo o ausente queda como cadena vacía. Un grupo se rechaza entero si tiene menos objetos válidos que su mínimo (la mitad de lo observado el 2026-11-02) o si se descartó más del 5 %.
- **En el navegador**, al cargar: el manifiesto debe ser de la versión 3 y tener un nombre de fichero del tipo `catalog.<8 hex>.json`, sin rutas ni URL; el catálogo debe coincidir con su hash SHA-256 (una descarga cortada o alterada se rechaza); `parseColumns` comprueba la forma (listas de la misma longitud, números finitos, categorías dentro de la tabla); y el número de objetos debe coincidir con el del manifiesto.

### El manifiesto

```json
{
  "schemaVersion": 3,
  "generatedAt": "2026-11-02T23:51:54.000Z",
  "catalog": { "file": "catalog.5db3ea79.json", "count": 19520, "sha256": "5db3ea79…" },
  "groups": [{ "group": "stations", "count": 20 }, …]
}
```

`generatedAt` es cuándo se descargaron los datos, y no es lo mismo que la época de cada objeto. `groups` recoge lo que trajo cada grupo antes de unirlos.

## Frescura y fiabilidad

Hay dos edades, y la ficha de cada satélite las resume en una sola frase («Fiable: elementos de hace 3 h») con el detalle plegado:

- **Edad de la descarga** (`generatedAt` frente a la hora real): hasta 3 h es normal, de 3 a 6 h es aviso, desde 6 h son datos desactualizados. CelesTrak actualiza cada 2 h.
- **Distancia a la época** (época del objeto frente a la hora simulada, hacia delante y hacia atrás): hasta 3 días es normal, de 3 a 7 días la precisión baja, desde 7 días es poco fiable. SGP4 pierde precisión al alejarse de la época. Sobre los 16 847 objetos de `active` (medido el 2026-11-02), el 90,8 % tiene la época con menos de un día, el 8,3 % entre 1 y 3 días, el 0,7 % entre 3 y 7 y el 0,2 % con más de 7.

Cuando haya despliegue automático, además se guardará la copia del último conjunto válido para servirla si CelesTrak falla (pendiente).

## Tamaño

| Qué | Sin comprimir | Comprimido (gzip) |
| --- | --- | --- |
| `catalog.<hash>.json` (19 520 objetos, 13 categorías) | 2,85 MB | 801 kB |
| Respuestas de CelesTrak que lo originan (suma de los 20 grupos, con duplicados) | 13,8 MB | n/d |
| `active` completo (JSON original de CelesTrak, 16 847 objetos) | 7,05 MB | 963 kB |

## Cómo se usan después

Al cargar, el navegador lee el manifiesto, descarga el catálogo y lo verifica. A partir de las columnas construye la lista del buscador y de la leyenda (`buildCatalog`, sin crear registros) y manda los números al Worker, que calcula las posiciones. La categoría de cada satélite sale de la tabla de categorías del catálogo; la leyenda parte con las categorías marcadas `hiddenByDefault` ocultas (los restos).

## Pendiente: SATCAT

[SATCAT](https://celestrak.org/satcat/search.php) es el catálogo de CelesTrak con lo que los elementos orbitales no traen: propietario, tipo (carga útil, resto, cuerpo de cohete), fecha de lanzamiento y estado. Permitiría separar restos de cargas útiles y filtrar por país. Antes de usarlo hay que comprobar su tamaño, su política de uso y que admita números de catálogo de 6 dígitos; no se ha hecho.
