#!/bin/bash

echo "========================================"
echo " UNUSED ANGULAR SERVICE CHECK"
echo "========================================"
echo

SERVICE_DIR="src/app/services"

if [ ! -d "$SERVICE_DIR" ]; then
  echo "ERROR: $SERVICE_DIR könyvtár nem található."
  exit 1
fi

find "$SERVICE_DIR" \
  -type f \
  -name "*.service.ts" |
while read -r file; do

  # Service class neve
  class_name=$(grep -oE 'export class [A-Za-z0-9_]+' "$file" \
    | head -n 1 \
    | awk '{print $3}')

  if [ -z "$class_name" ]; then
    continue
  fi

  # Megnézzük, hogy a service class használva van-e
  # máshol a src/app alatt.
  usage_count=$(grep -R -l \
    --include="*.ts" \
    "$class_name" \
    src/app 2>/dev/null \
    | grep -v "^$file$" \
    | wc -l)

  if [ "$usage_count" -eq 0 ]; then

    echo "POSSIBLY UNUSED:"
    echo "  File:  $file"
    echo "  Class: $class_name"
    echo
  fi

done

echo "========================================"
echo " CHECK FINISHED"
echo "========================================"
