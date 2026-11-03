#!/usr/bin/env bash
# Datos para el despliegue. Variables: EVENT (github.event_name), INPUT_REFRESH ("true" en un despliegue manual que pide datos
# nuevos) y SITE_URL (el sitio ya publicado).
#
# Solo el despliegue programado (cada 2 h) o uno manual con refresh descarga de CelesTrak: un cambio de código no debe volver a
# pedirle datos. Si CelesTrak falla, se republica la última copia buena del sitio; si tampoco la hay, el despliegue falla.
set -uo pipefail

refresh=false
[ "${EVENT:-}" = "schedule" ] && refresh=true
[ "${EVENT:-}" = "workflow_dispatch" ] && [ "${INPUT_REFRESH:-}" = "true" ] && refresh=true

if [ "$refresh" = "true" ]; then
  if npm run data; then exit 0; fi
  echo "::warning::CelesTrak no respondió o los datos no valían: se republica la última copia buena del sitio."
  npm run data:restore
else
  if npm run data:restore; then exit 0; fi
  echo "::notice::El sitio aún no tiene datos publicados: primera descarga de CelesTrak."
  npm run data
fi
