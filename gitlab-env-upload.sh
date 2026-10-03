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
    echo "Használat: $0 test|production"
    exit 1
    ;;
esac

[[ -f "$ENV_FILE" ]] || { echo "HIBA: $ENV_FILE nem található"; exit 1; }

upload_variable() {
  local KEY="$1" VALUE="$2" SCOPE="$3"
  local ENCODED_KEY ENCODED_SCOPE HTTP_CODE MASKED JSON_DATA

  ENCODED_KEY="$(jq -rn --arg v "$KEY" '$v|@uri')"
  ENCODED_SCOPE="$(jq -rn --arg v "$SCOPE" '$v|@uri')"
  MASKED="false"
  if [[ "$KEY" =~ (_PASSWORD|_SECRET|_TOKEN|_PRIVATE_KEY)$ ]]; then
    MASKED="true"
  fi

  JSON_DATA="$(jq -n \
    --arg value "$VALUE" \
    --arg scope "$SCOPE" \
    --arg masked "$MASKED" \
    '{value:$value,variable_type:"env_var",environment_scope:$scope,masked:($masked=="true"),protected:false}')"

  HTTP_CODE="$(curl --silent --output /dev/null --write-out '%{http_code}' \
    --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
    "${GITLAB_URL}/api/v4/projects/${PROJECT_ID}/variables/${ENCODED_KEY}?filter%5Benvironment_scope%5D=${ENCODED_SCOPE}")"

  if [[ "$HTTP_CODE" == "200" ]]; then
    curl --silent --show-error --fail --request PUT \
      --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
      --header "Content-Type: application/json" \
      --data "$JSON_DATA" \
      "${GITLAB_URL}/api/v4/projects/${PROJECT_ID}/variables/${ENCODED_KEY}?filter%5Benvironment_scope%5D=${ENCODED_SCOPE}" >/dev/null
    echo "frissítve: $KEY [$SCOPE]"
  elif [[ "$HTTP_CODE" == "404" ]]; then
    JSON_DATA="$(jq -n \
      --arg key "$KEY" --arg value "$VALUE" --arg scope "$SCOPE" --arg masked "$MASKED" \
      '{key:$key,value:$value,variable_type:"env_var",environment_scope:$scope,masked:($masked=="true"),protected:false}')"
    curl --silent --show-error --fail --request POST \
      --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
      --header "Content-Type: application/json" \
      --data "$JSON_DATA" \
      "${GITLAB_URL}/api/v4/projects/${PROJECT_ID}/variables" >/dev/null
    echo "létrehozva: $KEY [$SCOPE]"
  else
    echo "HIBA: GitLab API HTTP $HTTP_CODE ($KEY [$SCOPE])"
    exit 1
  fi
}

while IFS='=' read -r KEY VALUE || [[ -n "$KEY" ]]; do
  [[ -z "$KEY" ]] && continue
  [[ "$KEY" =~ ^[[:space:]]*# ]] && continue
  KEY="$(echo "$KEY" | xargs)"
  VALUE="$(echo "$VALUE" | sed 's/^ *//;s/ *$//')"
  [[ -z "$KEY" ]] && continue
  upload_variable "$KEY" "$VALUE" "$ENV_SCOPE"
done < "$ENV_FILE"

echo "GitLab frontend deploy változók feltöltve: $ENV_SCOPE"
