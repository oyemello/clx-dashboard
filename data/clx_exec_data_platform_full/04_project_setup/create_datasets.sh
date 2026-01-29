#!/usr/bin/env bash
set -euo pipefail
: "${BQ_LOCATION:=US}"
bq --location="${BQ_LOCATION}" mk -d amex_synth_raw || true
bq --location="${BQ_LOCATION}" mk -d amex_synth_semantic || true
bq --location="${BQ_LOCATION}" mk -d amex_synth_exec || true
echo "Datasets ready."
