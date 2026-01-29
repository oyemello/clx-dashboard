# CLX Exec Data Platform (Synthetic)

This bundle includes:
- Raw synthetic CSV data (100k customers, 2M transactions)
- BigQuery schemas (JSON)
- Semantic layer SQL (dims/facts + customer_360)
- Executive KPI layer SQL (+ rollup score)
- Role-based views (CEO/CFO/CRO/CMO/CPO/CDAO)
- Cloud Shell scripts to load + build everything

## Quick start (Cloud Shell)
1) Upload this zip to Cloud Shell and unzip:
   unzip clx_exec_data_platform_full.zip
   cd clx_exec_data_platform_full/04_project_setup

2) Ensure you're in the correct project:
   gcloud config set project YOUR_PROJECT_ID

3) Run everything:
   bash run_all.sh

## Validate
- Open 06_validation/row_count_checks.sql and replace ${PROJECT_ID} with your project id
- Open 06_validation/exec_dashboard_smoke_tests.sql and replace ${PROJECT_ID} with your project id

## Notes
- Default BigQuery location is US. Override by:
  export BQ_LOCATION=US
