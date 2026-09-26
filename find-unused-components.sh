#!/bin/bash

echo "========================================"
echo " UNUSED ANGULAR COMPONENT CHECK"
echo "========================================"
echo

COMPONENT_DIR="src/app/components"

if [ ! -d "$COMPONENT_DIR" ]; then
  echo "ERROR: $COMPONENT_DIR könyvtár nem található."
  exit 1
fi

find "$COMPONENT_DIR" \
  -type f \
  -name "*.component.ts" \
  ! -path "*.disabled*" |
while read -r file; do

  # Component class neve
  class_name=$(grep -oE 'export class [A-Za-z0-9_]+' "$file" \
    | head -n 1 \
    | awk '{print $3}')

  # Selector
  selector=$(grep -oE "selector:[[:space:]]*'[^']+'" "$file" \
    | head -n 1 \
    | sed -E "s/selector:[[:space:]]*'([^']+)'/\1/")

  if [ -z "$class_name" ]; then
    continue
  fi

  # Saját fájlt kizárjuk a keresésből
  class_usage=$(grep -R -l \
    --include="*.ts" \
    "$class_name" \
    src/app 2>/dev/null \
    | grep -v "^$file$" \
    | wc -l)

  selector_usage=0

  if [ -n "$selector" ]; then
    selector_usage=$(grep -R -l \
      --include="*.html" \
      "$selector" \
      src/app 2>/dev/null \
      | wc -l)
  fi

  # Ha sem class, sem selector alapján nincs használat
  if [ "$class_usage" -eq 0 ] && [ "$selector_usage" -eq 0 ]; then

    echo "POSSIBLY UNUSED:"
    echo "  File:     $file"
    echo "  Class:    $class_name"

    if [ -n "$selector" ]; then
      echo "  Selector: $selector"
    fi

    echo
  fi

done

echo "========================================"
echo " CHECK FINISHED"
echo "========================================"
