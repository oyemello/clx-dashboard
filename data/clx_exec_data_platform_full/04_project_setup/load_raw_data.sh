#!/usr/bin/env bash
set -euo pipefail
: "${PROJECT_ID:=$(gcloud config get-value project)}"
: "${BQ_LOCATION:=US}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="${ROOT_DIR}/00_raw_data"
SCHEMA_DIR="${DATA_DIR}/schemas"

echo "Loading raw CSVs into ${PROJECT_ID}:amex_synth_raw (location ${BQ_LOCATION})"

bq --location="${BQ_LOCATION}" load --source_format=CSV --skip_leading_rows=1 --schema="${SCHEMA_DIR}/customers.schema.json"   "${PROJECT_ID}:amex_synth_raw.customers" "${DATA_DIR}/customers_100k.csv"

bq --location="${BQ_LOCATION}" load --source_format=CSV --skip_leading_rows=1 --schema="${SCHEMA_DIR}/accounts.schema.json"   "${PROJECT_ID}:amex_synth_raw.accounts" "${DATA_DIR}/accounts_150k.csv"

bq --location="${BQ_LOCATION}" load --source_format=CSV --skip_leading_rows=1 --schema="${SCHEMA_DIR}/transactions.schema.json"   "${PROJECT_ID}:amex_synth_raw.transactions" "${DATA_DIR}/transactions_2M.csv"

bq --location="${BQ_LOCATION}" load --source_format=CSV --skip_leading_rows=1 --schema="${SCHEMA_DIR}/monthly_snapshots.schema.json"   "${PROJECT_ID}:amex_synth_raw.monthly_snapshots" "${DATA_DIR}/monthly_snapshots_100k.csv"

echo "Raw load complete."
