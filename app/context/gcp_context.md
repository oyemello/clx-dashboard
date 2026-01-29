# GCP Data Context – CLX Platform

This system connects to Google Cloud Platform (GCP) as its data source.

## 1. BigQuery (Queryable Data Layer)

All queryable data lives in BigQuery.

**Project ID**
- clx-main-platform

**Primary Dataset for Metrics**
- clx_exec

**Tables**
- clx_exec.customers
- clx_exec.accounts

These tables are the source of truth for all metric calculations.

The system should:
- Discover tables from the `clx_exec` dataset
- Use BigQuery SQL for querying
- Treat these tables as read-only

## 2. Cloud Storage (Metric Definitions & Config)

Metric definitions, semantic logic, and validation rules are stored as files in Cloud Storage.

**Bucket**
- gs://clx-main-platform-files-1768866733

**Path**
- clx_exec_data_platform_full/

**Relevant folders**
- 01_semantic_layer/ → semantic SQL logic
- 02_exec_metrics_layer/ → KPI definitions
- 03_role_based_views/ → role-based metric access
- 05_data_dictionary/ → column and metric descriptions
- 06_validation/ → validation rules

These files define HOW metrics are calculated, not the raw data itself.

## 3. Expected System Behavior

When initializing:
- Connect to BigQuery project `clx-main-platform`
- Scan dataset `clx_exec` for available tables
- Load metric definitions from Cloud Storage
- Expose metrics based on SQL definitions, not raw column names

The system should NOT:
- Expect CSV files at runtime
- Expect data to live in Cloud Storage
- Autogenerate metrics without referencing metric definitions

## 4. Mental Model

BigQuery = database (tables, rows, columns)
Cloud Storage = config (SQL, definitions, rules)

Metrics are computed by applying SQL definitions (from Cloud Storage)
to BigQuery tables.