#!/usr/bin/env bash
set -euo pipefail
: "${PROJECT_ID:=$(gcloud config get-value project)}"

for dir in 02_exec_metrics_layer 03_role_based_views; do
  SQL_DIR="$(cd "$(dirname "$0")/../${dir}" && pwd)"
  for f in "${SQL_DIR}"/*.sql; do
    echo "Running ${dir}/$(basename "$f")"
    sed "s/\${PROJECT_ID}/${PROJECT_ID}/g" "$f" | bq query --use_legacy_sql=false
  done
done
echo "Exec metrics + role views built."
