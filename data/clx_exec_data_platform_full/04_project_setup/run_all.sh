#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
bash "${SCRIPT_DIR}/create_datasets.sh"
bash "${SCRIPT_DIR}/load_raw_data.sh"
bash "${SCRIPT_DIR}/build_semantic_layer.sh"
bash "${SCRIPT_DIR}/build_exec_layer.sh"
echo "All done."
