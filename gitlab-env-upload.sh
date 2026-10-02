#!/bin/bash

set -euo pipefail

GITLAB_URL="http://192.168.1.37:81"
PROJECT_ID="14"

: "${GITLAB_TOKEN:?A GITLAB_TOKEN környezeti változó nincs beállítva}"

ENVIRONMENT="${1:-}"

case "$ENVIRONMENT" in
    test)
        ENV_FILE=".test.env"
        ENV_SCOPE="test"
        ;;
    production)
        ENV_FILE=".env"
        ENV_SCOPE="production"
        ;;
    *)
        echo "Használat:"
        echo "  $0 test"
        echo "  $0 production"
        exit 1
        ;;
esac

if [[ ! -f "$ENV_FILE" ]]; then
    echo "HIBA: Az env fájl nem található: $ENV_FILE"
    exit 1
fi

echo "Környezet: $ENVIRONMENT"
echo "Env fájl:  $ENV_FILE"
echo "GitLab scope: $ENV_SCOPE"
echo


# ============================================================
# GITLAB VARIABLE FELTÖLTÉS
# ============================================================

upload_variable() {
    local KEY="$1"
    local VALUE="$2"
    local SCOPE="$3"

    echo "Feltöltés: $KEY [$SCOPE]"

    # ========================================================
    # Secret változók maszkolása
    # Csak akkor masked, ha a változó NEVE valóban
    # érzékeny értékre utal.
    #
    # Például:
    # DB_PASSWORD                         -> masked
    # JWT_SECRET                          -> masked
    # MAIL_PASSWORD                       -> masked
    # PASSWORD_RESET_TOKEN                -> masked
    # PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES -> NOT masked
    # ========================================================

    local MASKED="false"

    if [[ "$KEY" =~ (_PASSWORD|_SECRET|_TOKEN|_PRIVATE_KEY)$ ]]; then
        MASKED="true"
    fi

    # ========================================================
    # URL encode
    # ========================================================

    local ENCODED_SCOPE
    ENCODED_SCOPE="$(jq -rn --arg v "$SCOPE" '$v|@uri')"

    local ENCODED_KEY
    ENCODED_KEY="$(jq -rn --arg v "$KEY" '$v|@uri')"

    # ========================================================
    # JSON
    # ========================================================

    local JSON_DATA

    JSON_DATA="$(
        jq -n \
            --arg value "$VALUE" \
            --arg scope "$SCOPE" \
            --arg masked "$MASKED" \
            '{
                value: $value,
                variable_type: "env_var",
                environment_scope: $scope,
                masked: ($masked == "true"),
                protected: false
            }'
    )"

    # ========================================================
    # Először ellenőrizzük, hogy létezik-e
    # ========================================================

    local HTTP_CODE

    HTTP_CODE="$(
        curl \
            --silent \
            --output /dev/null \
            --write-out "%{http_code}" \
            --request GET \
            --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
            "${GITLAB_URL}/api/v4/projects/${PROJECT_ID}/variables/${ENCODED_KEY}?filter%5Benvironment_scope%5D=${ENCODED_SCOPE}"
    )"

    # ========================================================
    # Meglévő változó -> UPDATE
    # ========================================================

    if [[ "$HTTP_CODE" == "200" ]]; then

        curl \
            --silent \
            --show-error \
            --fail \
            --request PUT \
            --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
            --header "Content-Type: application/json" \
            --data "$JSON_DATA" \
            "${GITLAB_URL}/api/v4/projects/${PROJECT_ID}/variables/${ENCODED_KEY}?filter%5Benvironment_scope%5D=${ENCODED_SCOPE}" \
            > /dev/null

        echo "  -> frissítve"
        return 0
    fi

    # ========================================================
    # Nem létező változó -> CREATE
    # ========================================================

    if [[ "$HTTP_CODE" == "404" ]]; then

        JSON_DATA="$(
            jq -n \
                --arg key "$KEY" \
                --arg value "$VALUE" \
                --arg scope "$SCOPE" \
                --arg masked "$MASKED" \
                '{
                    key: $key,
                    value: $value,
                    variable_type: "env_var",
                    environment_scope: $scope,
                    masked: ($masked == "true"),
                    protected: false
                }'
        )"

        curl \
            --silent \
            --show-error \
            --fail \
            --request POST \
            --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
            --header "Content-Type: application/json" \
            --data "$JSON_DATA" \
            "${GITLAB_URL}/api/v4/projects/${PROJECT_ID}/variables" \
            > /dev/null

        echo "  -> létrehozva"
        return 0
    fi

    # ========================================================
    # Egyéb HTTP hiba
    # ========================================================

    echo "HIBA: GitLab API HTTP státusz: $HTTP_CODE"
    echo "Változó: $KEY"
    echo "Scope: $SCOPE"
    exit 1
}


# ============================================================
# ENV FILE FELDOLGOZÁSA
# ============================================================

while IFS='=' read -r KEY VALUE || [[ -n "$KEY" ]]; do

    # Üres sorok kihagyása
    [[ -z "$KEY" ]] && continue

    # Kommentek kihagyása
    [[ "$KEY" =~ ^[[:space:]]*# ]] && continue

    # KEY whitespace eltávolítása
    KEY="$(echo "$KEY" | xargs)"

    # VALUE eleji és végi whitespace eltávolítása
    VALUE="$(echo "$VALUE" | sed 's/^ *//;s/ *$//')"

    [[ -z "$KEY" ]] && continue

    # ========================================================
    # Normál változó feltöltése
    # ========================================================

    upload_variable \
        "$KEY" \
        "$VALUE" \
        "$ENV_SCOPE"

    # ========================================================
    # TEST:
    #
    # TEST_DB_URL -> DB_URL alias
    #
    # Spring tesztek:
    #   TEST_DB_URL
    #
    # Docker Compose/runtime:
    #   DB_URL
    # ========================================================

    if [[ "$ENVIRONMENT" == "test" && "$KEY" == "TEST_DB_URL" ]]; then

        echo "TEST_DB_URL -> DB_URL [test]"

        upload_variable \
            "DB_URL" \
            "$VALUE" \
            "$ENV_SCOPE"

    fi

done < "$ENV_FILE"


# ============================================================
# DEPLOY VÁLTOZÓK KÖTELEZŐ ELLENŐRZÉSE
# ============================================================

if [[ "$ENVIRONMENT" == "test" ]]; then

    echo
    echo "Deploy változók ellenőrzése..."

    for REQUIRED_KEY in DEPLOY_SERVER DEPLOY_USER DEPLOY_PATH; do

        REQUIRED_VALUE="$(
            grep -E "^${REQUIRED_KEY}=" "$ENV_FILE" \
            | head -n 1 \
            | cut -d '=' -f2-
        )"

        if [[ -z "$REQUIRED_VALUE" ]]; then
            echo "HIBA: Hiányzó változó: $REQUIRED_KEY"
            echo
            echo "Az $ENV_FILE fájlban kötelező:"
            echo "  DEPLOY_SERVER=..."
            echo "  DEPLOY_USER=..."
            echo "  DEPLOY_PATH=..."
            exit 1
        fi

        echo "  $REQUIRED_KEY=$REQUIRED_VALUE"

    done

fi


# ============================================================
# KÉSZ
# ============================================================

echo
echo "GitLab Variables feltöltése kész."
echo "Environment scope: $ENV_SCOPE"
