#!/usr/bin/env bash
# Regenera las texturas KTX2 de la Tierra desde Solar System Scope (CC BY 4.0).
# Requisitos: toktx >= 4.4 (KTX-Software), curl y python3 con Pillow.
# Uso: scripts/build-textures.sh [directorio_de_salida]   (por defecto public/textures/earth)
set -euo pipefail

OUT="${1:-public/textures/earth}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
BASE_URL="https://www.solarsystemscope.com/textures/download"

for f in 8k_earth_daymap.jpg 8k_earth_clouds.jpg 8k_earth_specular_map.tif; do
  curl -fsSL -o "$WORK/$f" "$BASE_URL/$f"
done

# toktx no lee TIF y solo voltea PNG, no JPEG; nubes y specular necesitan un solo canal (luminancia).
python3 -I - "$WORK" <<'PY'
import sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
w = sys.argv[1]
Image.open(f"{w}/8k_earth_daymap.jpg").convert("RGB").save(f"{w}/day.png")
Image.open(f"{w}/8k_earth_clouds.jpg").convert("L").save(f"{w}/clouds.png")
Image.open(f"{w}/8k_earth_specular_map.tif").convert("L").save(f"{w}/specular.png")
PY

mkdir -p "$OUT"
# ETC1S (BasisLZ): en el mapa de día el 8K pesa menos que el JPEG original y queda en la GPU comprimido.
# UASTC pesaba 13 MB en 8K. Color en sRGB; nubes y specular son datos lineales de un canal.
color=(--assign_oetf srgb --encode etc1s --clevel 3 --qlevel 192)
mask=(--assign_oetf linear --target_type R --encode etc1s --clevel 3 --qlevel 192)
clouds=(--assign_oetf linear --target_type R --encode etc1s --clevel 3 --qlevel 128)
# --lower_left_maps_to_s0t0: KTX2 guarda la primera fila arriba, pero las UV de la esfera de three esperan el norte en t=1.
# Sin voltear, la Tierra sale cabeza abajo.
enc() { toktx --t2 --lower_left_maps_to_s0t0 --genmipmap --threads "$(nproc)" "$@"; }

enc "${color[@]}"  --resize 2048x1024 "$OUT/day-2k.ktx2"      "$WORK/day.png"
enc "${color[@]}"                     "$OUT/day-8k.ktx2"      "$WORK/day.png"
enc "${mask[@]}"   --resize 2048x1024 "$OUT/specular-2k.ktx2" "$WORK/specular.png"
enc "${clouds[@]}" --resize 2048x1024 "$OUT/clouds-2k.ktx2"   "$WORK/clouds.png"

ls -l "$OUT"/*.ktx2
