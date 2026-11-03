# Despliegue

La web es estática y se publica en GitHub Pages con una GitHub Action (`.github/workflows/deploy.yml`). La misma Action refresca los datos de CelesTrak cada 2 horas, sin hacer commits.

## Cuándo se despliega

| Disparador | Datos | Motivo |
| --- | --- | --- |
| Cada 2 h (`17 */2 * * *`, minuto 17 para evitar el retraso de la hora en punto) | **Se descargan de CelesTrak** | CelesTrak actualiza cada 2 h y pide una descarga por actualización |
| Un cambio en `main` | Se reutilizan los **ya publicados** | Un cambio de código no debe volver a pedir datos a CelesTrak |
| Despliegue manual (`workflow_dispatch`) | Los publicados, o nuevos si se marca «refresh» | Para forzar una actualización o un despliegue sin esperar |

El primer despliegue, cuando aún no hay sitio publicado, descarga de CelesTrak.

## Qué hace cada ejecución

1. `npm ci` y `npm test`: si algún test falla, no se despliega.
2. Se restaura la caché de CelesTrak (`actions/cache`, ≈ 4 MB comprimido, una clave nueva por ejecución). Así cada ejecución programada solo pide `active`, y los otros 39 grupos y el SATCAT una vez al día.
3. `scripts/ci-data.sh` obtiene los datos (ver abajo).
4. `npm run build` con `BASE_PATH` fijado por `configure-pages` (en `https://usuario.github.io/orbitwatch/` el sitio cuelga de `/orbitwatch/`; con dominio propio es `/`).
5. Se sube `dist/` y se despliega.

Los despliegues se ejecutan de uno en uno y uno en marcha no se cancela (cortarlo dejaría el sitio a medio publicar).

## Coste en la cuenta gratuita

En un repositorio público, las GitHub Actions con los ejecutores estándar no gastan minutos del plan gratuito, y el despliegue a Pages desde una Action no cuenta para el límite de 10 compilaciones por hora de Pages. Una ejecución dura pocos minutos y publica menos de 5 MB, muy por debajo del límite de 1 GB del sitio. Cada 2 h son 12 ejecuciones al día. El límite real es la cortesía con CelesTrak: por eso la caché escalonada (≈ 53 peticiones al día). Si se quisiera menos, bastaría cambiar el `cron` a cada 6 h (datos con hasta 6 h) o a uno al día. Un detalle: en repositorios públicos GitHub desactiva las ejecuciones programadas tras 60 días sin actividad en el repositorio.

## Si CelesTrak falla

`scripts/ci-data.sh` no sirve nunca datos a medias. Si la descarga programada falla (cualquier respuesta distinta de 200, red caída, datos que no pasan la validación), **se republica la última copia buena del sitio** (`scripts/restoreData.ts` trae el manifiesto y el catálogo publicados, comprueba el hash y el recuento, y no escribe nada si algo falla). La web sigue funcionando y la línea «datos de hace X» deja de avanzar y pasa a aviso a las 3 h y a «desactualizados» a las 6 h. Si tampoco hay copia publicada, la ejecución falla y no se despliega nada. La política de CelesTrak manda parar ante cualquier error, sin reintentar: la Action no reintenta; la siguiente ejecución programada es 2 h después.

## Qué se publica

`dist/` con la aplicación y `data/`: `manifest.json` y un único `catalog.<hash>.json`. El navegador revalida el manifiesto en cada carga (`cache: 'no-cache'`), porque nombra un catálogo con hash que cambia en cada actualización y uno en caché apuntaría a un fichero que ya no existe; el catálogo no hace falta revalidarlo, su nombre cambia si su contenido cambia.

## Puesta en marcha (una sola vez)

1. El repositorio es público (GitHub Pages es gratis solo así).
2. Activar Pages con origen «GitHub Actions»: `gh api -X POST repos/<usuario>/orbitwatch/pages -f build_type=workflow`, o en *Settings → Pages → Source → GitHub Actions*.
3. Subir los cambios a `main`: el primer despliegue arranca solo.

## Dominio propio, más adelante

El sitio funciona en la URL de GitHub. Para usar un subdominio (por ejemplo `orbitwatch.tudominio.com`) con el DNS en Vercel:

1. En el panel DNS de Vercel, añadir un registro `CNAME` de `orbitwatch` a `<usuario>.github.io`.
2. En *Settings → Pages → Custom domain*, escribir el subdominio y activar *Enforce HTTPS* cuando GitHub emita el certificado.
3. No hay que tocar el código: `configure-pages` devuelve entonces una ruta base vacía y la aplicación se construye para `/`.

Una ruta dentro de un dominio existente (`tudominio.com/orbitwatch`) exigiría que el proyecto principal reenviara esa ruta a GitHub Pages; no se ha preparado.

## Medir en tu equipo

Con el sitio publicado, añade `?perf` a la URL para ver las métricas de rendimiento en tu GPU real (ver [RENDIMIENTO.md](RENDIMIENTO.md)).
