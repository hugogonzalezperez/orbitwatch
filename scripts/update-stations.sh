#!/usr/bin/env bash
# Descarga el grupo `stations` de CelesTrak (OMM en JSON) a public/data/stations.json.
# Política de CelesTrak: una descarga por actualización (cada 2 h). Ante cualquier respuesta distinta de 200 se para sin reintentar.
# shortcut: instantánea manual hasta que exista la Action de datos (plan B3 y B7).
set -euo pipefail

OUT="${1:-public/data/stations.json}"
URL="https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

STATUS="$(curl -sS -A 'orbitwatch/0.1 (visualizador de satelites, proyecto personal)' -o "$TMP" -w '%{http_code}' "$URL")"
if [ "$STATUS" != "200" ]; then
  echo "CelesTrak respondió HTTP $STATUS. No se reintenta: espera a la próxima actualización." >&2
  exit 1
fi

# Debe ser una lista JSON que incluya la ISS; si CelesTrak cambia de formato, no pisamos los datos buenos.
node -e '
  const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))
  if (!Array.isArray(d) || !d.some((o) => o.NORAD_CAT_ID === 25544)) throw new Error("la respuesta no tiene la ISS")
' "$TMP"

# El manifiesto guarda cuándo se descargó, que no es lo mismo que la época de los elementos.
MANIFEST="$(dirname "$OUT")/manifest.json"
printf '{\n  "schemaVersion": 1,\n  "generatedAt": "%s",\n  "source": "celestrak.org GROUP=stations"\n}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$MANIFEST"

mv "$TMP" "$OUT"
trap - EXIT
echo "Escrito $OUT ($(wc -c <"$OUT") bytes) y $MANIFEST"
