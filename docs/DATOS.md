# Datos de los satélites

## Fuente

[CelesTrak](https://celestrak.org/), API GP, formato **OMM en JSON**. Consulta: `https://celestrak.org/NORAD/elements/gp.php?GROUP=<grupo>&FORMAT=json`. Hay que pedir el formato explícitamente. El proyecto usa `celestrak.org` (el dominio `.com` redirige y la descarga trata cualquier redirección como un error).

Grupos que se descargan hoy (cifras del 2026-11-02): `stations` (20 objetos, de donde sale la ISS), `weather` (74) y `starlink` (11 156). La lista está en `src/satellites/data/groups.ts` con un mínimo de objetos por grupo.

Otros grupos de CelesTrak (verificados en su página, aún no usados): `active`, `visual`, `oneweb`, `gnss`, `geo`, `cubesat` y los de restos `fengyun-1c-debris`, `iridium-33-debris`, `cosmos-2251-debris`. `active` tiene 16 847 objetos (11 183 de Starlink y 949 con número de catálogo de 6 dígitos), 7,05 MB en JSON o 963 kB comprimido.

## Política de uso de CelesTrak y cómo se respeta

Fuente: [política de uso](https://celestrak.org/usage-policy.php).

| Norma | Cómo se cumple |
| --- | --- |
| Los datos GP se actualizan cada 2 h; descargar una sola vez por actualización | Un único proceso descarga (el script, y más adelante una Action programada). El navegador nunca consulta CelesTrak |
| Ante cualquier respuesta distinta de 200, dejar de consultar | `fetchGroups` se detiene en el primer fallo, sin reintentos, y no escribe ningún fichero |
| Más de 50 respuestas 301, 403 o 404 en 2 h pueden acabar con la IP bloqueada | Una petición por grupo y ejecución, sin bucles; las redirecciones se tratan como error (`redirect: 'error'`) |
| Las listas grandes (`active`, `starlink`) empiezan a tener límites | Se piden pocos grupos, una vez, y no se pide el catálogo completo |
| Muchos usuarios tras una IP: usar un proxy con caché | La capa estática hace de caché |
| Identificarse | Cabecera `User-Agent` con el nombre del proyecto y el repositorio |

Los datos no llevan `Last-Modified` ni `ETag`, así que no se puede preguntar «¿ha cambiado?» sin descargar.

## El proceso: `npm run data`

`scripts/update-data.ts` descarga los grupos de uno en uno, valida cada registro y, solo si todos los grupos llegan enteros y válidos, escribe en `public/data/` un fichero por grupo (`<grupo>.json`, reducido a los 13 campos que SGP4 y la interfaz necesitan) y `manifest.json`. `public/data/` no se versiona. Hay que ejecutarlo antes de `npm run dev`; hacerlo más de una vez cada 2 h va contra la política de CelesTrak.

### Validación (`src/satellites/data/omm.ts`)

- Cada registro necesita estos campos numéricos y finitos: `NORAD_CAT_ID`, `MEAN_MOTION`, `ECCENTRICITY`, `INCLINATION`, `RA_OF_ASC_NODE`, `ARG_OF_PERICENTER`, `MEAN_ANOMALY`, `BSTAR`, `MEAN_MOTION_DOT`, `MEAN_MOTION_DDOT`, y una `EPOCH` que sea una fecha (UTC, aunque CelesTrak no ponga zona horaria).
- Se descarta el registro con excentricidad fuera de [0, 1), movimiento medio ≤ 0 o inclinación fuera de [0°, 180°].
- Una época en el futuro se acepta (hay objetos reales así). Un nombre o designador nulo o ausente queda como cadena vacía.
- Un grupo se rechaza entero si tiene menos objetos válidos que su mínimo o si se descartó más del 5 %.
- El navegador vuelve a validar al cargar (`parseOmmList`), y el manifiesto solo admite nombres de fichero del tipo `[a-z0-9-]+.json`, sin rutas ni URL.

### El manifiesto

```json
{
  "schemaVersion": 2,
  "generatedAt": "2026-11-02T20:34:00.000Z",
  "sources": [{ "group": "stations", "file": "stations.json", "count": 20 }]
}
```

`generatedAt` es cuándo se descargaron los datos, y no es lo mismo que la época de cada objeto.

## Frescura y fiabilidad

Hay dos edades, y la ficha de cada satélite las resume en una sola frase («Fiable: elementos de hace 3 h») con el detalle plegado:

- **Edad de la descarga** (`generatedAt` frente a la hora real): hasta 3 h es normal, de 3 a 6 h es aviso, desde 6 h son datos desactualizados. CelesTrak actualiza cada 2 h.
- **Distancia a la época** (época del objeto frente a la hora simulada, hacia delante y hacia atrás): hasta 3 días es normal, de 3 a 7 días la precisión baja, desde 7 días es poco fiable. SGP4 pierde precisión al alejarse de la época. Sobre los 16 847 objetos de `active` (medido el 2026-11-02), el 90,8 % tiene la época con menos de un día, el 8,3 % entre 1 y 3 días, el 0,7 % entre 3 y 7 y el 0,2 % con más de 7.

Cuando haya despliegue automático, además se guardará la copia del último conjunto válido para servirla si CelesTrak falla (pendiente).

## Tamaño

| Qué | Sin comprimir | Comprimido (gzip) |
| --- | --- | --- |
| `starlink.json` (11 156 objetos, 13 campos) | 3,7 MB | 594 kB |
| `active` completo (JSON original de CelesTrak) | 7,05 MB | 963 kB |
| `active` en formato por columnas (prueba) | 2,36 MB | 650 kB |

El formato por columnas (un array por campo) es una mejora posible; todavía no se usa.

## Cómo se usan después

Al cargar, el navegador lee el manifiesto, descarga los ficheros listados y valida cada registro. De `stations` sale la ISS, que se elige al arrancar; el resto de grupos forman el enjambre. Un objeto que aparezca en dos grupos solo cuenta en el primero. La categoría de cada satélite es el grupo de CelesTrak del que sale (`src/satellites/categories.ts`).
