#!/usr/bin/env bash
set -euo pipefail
: "${PROJECT_ID:=$(gcloud config get-value project)}"
SQL_DIR="$(cd "$(dirname "$0")/../01_semantic_layer" && pwd)"

for f in "${SQL_DIR}"/*.sql; do
  echo "Running $(basename "$f")"
  sed "s/\${PROJECT_ID}/${PROJECT_ID}/g" "$f" | bq query --use_legacy_sql=false
done
echo "Semantic layer built."
