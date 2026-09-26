#!/bin/bash

echo "========================================"
echo " UNUSED ANGULAR MODEL CHECK"
echo "========================================"
echo

MODEL_DIR="src/app/models"

if [ ! -d "$MODEL_DIR" ]; then
  echo "ERROR: $MODEL_DIR könyvtár nem található."
  exit 1
fi

find "$MODEL_DIR" \
  -type f \
  -name "*.ts" |
while read -r file; do

  # Megpróbáljuk kinyerni az exportált interface,
  # class vagy type neveket.
  model_names=$(grep -oE \
    'export (interface|class|type) [A-Za-z0-9_]+' \
    "$file" \
    | awk '{print $3}')

  # Ha nincs exportált típus, kihagyjuk.
  if [ -z "$model_names" ]; then
    continue
  fi

  unused=true

  for model_name in $model_names; do

    usage_count=$(grep -R -l \
      --include="*.ts" \
      "$model_name" \
      src/app 2>/dev/null \
      | grep -v "^$file$" \
      | wc -l)

    if [ "$usage_count" -gt 0 ]; then
      unused=false
    fi

  done

  if [ "$unused" = true ]; then

    echo "POSSIBLY UNUSED:"
    echo "  File: $file"
    echo "  Exports:"

    for model_name in $model_names; do
      echo "    - $model_name"
    done

    echo
  fi

done

echo "========================================"
echo " CHECK FINISHED"
echo "========================================"
