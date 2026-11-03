#!/usr/bin/env bash
# Datos para el despliegue. Variables: EVENT (github.event_name), INPUT_REFRESH y SITE_URL (el sitio ya publicado).
# Solo el despliegue programado o un manual con refresh descarga de CelesTrak; si falla, se republica la última copia buena.
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
