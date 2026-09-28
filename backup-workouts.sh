cat > ~/backup-workouts.sh <<'EOF'
#!/bin/bash

set -euo pipefail

TIMESTAMP="$(date '+%Y%m%d_%H%M')"
DEST="/Users/pappzs/Downloads"

E2E_DIR="/Users/pappzs/Documents/develop/workouts-frontend/e2e"
BACKEND_DIR="/Users/pappzs/Documents/develop/workouts-project/src"
FRONTEND_DIR="/Users/pappzs/Documents/develop/workouts-frontend/src"

E2E_ZIP="${DEST}/e2e_${TIMESTAMP}.zip"
BACKEND_ZIP="${DEST}/workouts-backend_${TIMESTAMP}.zip"
FRONTEND_ZIP="${DEST}/workouts-frontend-src_${TIMESTAMP}.zip"

echo
echo "=========================================="
echo " Workouts backup"
echo "=========================================="
echo "Dátum/idő: $TIMESTAMP"
echo

# Könyvtárak ellenőrzése
for DIR in "$E2E_DIR" "$BACKEND_DIR" "$FRONTEND_DIR"; do
    if [[ ! -d "$DIR" ]]; then
        echo "HIBA: A könyvtár nem található:"
        echo "$DIR"
        exit 1
    fi
done

# Downloads ellenőrzése
if [[ ! -d "$DEST" ]]; then
    echo "HIBA: A Downloads könyvtár nem található:"
    echo "$DEST"
    exit 1
fi

# ------------------------------------------------------------
# 1. E2E
# ------------------------------------------------------------

echo "[1/3] E2E tömörítése..."

rm -f "$E2E_ZIP"

(
    cd "/Users/pappzs/Documents/develop/workouts-frontend"
    zip -rq "$E2E_ZIP" "e2e"
)

echo "      OK: $E2E_ZIP"

# ------------------------------------------------------------
# 2. Backend src
# ------------------------------------------------------------

echo "[2/3] Backend src tömörítése..."

rm -f "$BACKEND_ZIP"

(
    cd "/Users/pappzs/Documents/develop/workouts-project"
    zip -rq "$BACKEND_ZIP" "src"
)

echo "      OK: $BACKEND_ZIP"

# ------------------------------------------------------------
# 3. Frontend src
# ------------------------------------------------------------

echo "[3/3] Frontend src tömörítése..."

rm -f "$FRONTEND_ZIP"

(
    cd "/Users/pappzs/Documents/develop/workouts-frontend"
    zip -rq "$FRONTEND_ZIP" "src"
)

echo "      OK: $FRONTEND_ZIP"

# ------------------------------------------------------------
# ZIP-ek ellenőrzése
# ------------------------------------------------------------

echo
echo "ZIP-ek ellenőrzése..."

unzip -t "$E2E_ZIP" >/dev/null
echo "✓ $(basename "$E2E_ZIP")"

unzip -t "$BACKEND_ZIP" >/dev/null
echo "✓ $(basename "$BACKEND_ZIP")"

unzip -t "$FRONTEND_ZIP" >/dev/null
echo "✓ $(basename "$FRONTEND_ZIP")"

echo
echo "=========================================="
echo " BACKUP KÉSZ"
echo "=========================================="
echo

ls -lh \
    "$E2E_ZIP" \
    "$BACKEND_ZIP" \
    "$FRONTEND_ZIP"

echo
echo "Fájlok:"
echo "$DEST"
echo
EOF

chmod +x ~/backup-workouts.sh
~/backup-workouts.sh
